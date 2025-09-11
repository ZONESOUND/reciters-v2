import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from "tone";

const soundModules = import.meta.glob('../sounds/**/*.mp3', { as: 'url', eager: true });
const getSoundAssets = () => {
    const soundFiles = [];
    const soundStateNum = [];
    let count = 0;
    let prev = '';

    const sortedKeys = Object.keys(soundModules).sort();

    sortedKeys.forEach((path) => {
        const currentGroup = path.substring(0, path.lastIndexOf('/'));
        if (currentGroup !== prev) {
            prev = currentGroup;
            soundStateNum.push(count);
        }
        count ++;
        soundFiles.push(soundModules[path]);
    });
    soundStateNum.push(count);
    
    console.log('Pre-processed sound metadata:', { soundFiles, soundStateNum });
    return { soundFiles, soundStateNum };
};

const { soundFiles, soundStateNum } = getSoundAssets();

/**
 * 根據傳入的指令資料計算最終的音效索引。
 * @param {object} data - 包含播放指令的物件。
 * @returns {number} - 計算後的音效索引，如1果無效則返回 -1。
 */
const calculateSoundOrder = (data) => {
    if (!data.set || data.set <= 0 || data.set >= soundStateNum.length) {
        return -1;
    }

    let order = -1;
    if ('order' in data) {
        const baseIndex = soundStateNum[data.set - 1];
        if (data.orderTo && data.orderTo > data.order) {
            const range = data.orderTo - data.order;
            order = data.order + Math.floor(Math.random() * range);
        } else {
            order = data.order;
        }
        order += baseIndex;
    }
    return (order >= 0 && order < soundFiles.length) ? order : -1;
};

function MusicBoxMin({ stop, refresh, data, onVolumeChange }) {
    const activePlayerRef = useRef(null); // Ref to hold the currently active player instance
    const meterRef = useRef(null);
    const animationFrameId = useRef(null);
    const peakVolumesRef = useRef([]); // Ref to store peak volumes for each sound
    const lastProcessedRefresh = useRef(null); // Ref 來追蹤最後處理過的觸發器
    const [peaksReady, setPeaksReady] = useState(false);

    useEffect(() => {
        console.log('MusicBox: Initializing and loading sounds...');
        
        const meter = new Tone.Meter();
        meterRef.current = meter;

        meter.toDestination();

        // Analyze peak volumes before setting players and readiness
        const analyzePeaks = async () => {
            try {
                const peaks = await Promise.all(soundFiles.map(async (url) => {
                    const buffer = await new Tone.Buffer().load(url);
                    const channelData = buffer.getChannelData(0); // Analyze the first channel
                    let max = 0;
                    for (let i = 0; i < channelData.length; i++) {
                        max = Math.max(max, Math.abs(channelData[i]));
                    }
                    return max; // Peak amplitude between 0 and 1
                }));
                peakVolumesRef.current = peaks;
                console.log('MusicBox: Peak volumes analyzed:', peaks);
                setPeaksReady(true);
                console.log('MusicBox: Peak analysis complete. Ready to play.');
            } catch (error) {
                console.error("MusicBox: Error analyzing or loading sounds", error);
            }
        };

        analyzePeaks();

        return () => {
            console.log('MusicBox: Cleaning up Tone.js players and meter...');
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (activePlayerRef.current && !activePlayerRef.current.disposed) {
                activePlayerRef.current.stop();
                activePlayerRef.current.dispose();
            }
            if (meterRef.current && !meterRef.current.disposed) {
                meterRef.current.dispose();
            }
        };
    }, []);

    const stopVolumeAnalysis = useCallback((resetOpacity = true) => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
        if (onVolumeChange && resetOpacity) {
            onVolumeChange(0);
        }
    }, [onVolumeChange]);

    const startVolumeAnalysis = useCallback((peakVolume) => {
        // Stop any previous loop to be safe
        stopVolumeAnalysis(false); // Stop previous loop but don't reset opacity
        
        if (!onVolumeChange || !meterRef.current) return;

        // Convert peak amplitude (0-1) to dB. Add a small epsilon to avoid log(0).
        // A peak of 1.0 is 0 dB. A peak of 0.5 is approx -6 dB.
        const maxDb = 20 * Math.log10(peakVolume + Number.EPSILON);

        const analyze = () => {
            if (!meterRef.current || meterRef.current.disposed) return;

            const mapVolumeToOpacity = (db) => {
                const MIN_DB = -60;
                const MAX_DB = maxDb + 1;
                const clampedDb = Math.max(MIN_DB, Math.min(db, MAX_DB));
                const normalized = (clampedDb - MIN_DB) / (MAX_DB - MIN_DB);
                return Math.pow(normalized, 1.8);
            };

            const db = meterRef.current.getValue();
            const volume = mapVolumeToOpacity(db);
            onVolumeChange(volume);
            animationFrameId.current = requestAnimationFrame(analyze);
        };
        animationFrameId.current = requestAnimationFrame(analyze);
    }, [onVolumeChange, stopVolumeAnalysis]);

    const stopAll = useCallback(() => {
        const player = activePlayerRef.current;
        if (player && player.loaded && player.state !== 'stopped') {
            // player.stop() will trigger the onstop callback which handles analysis stopping
            player.stop();
        }
        activePlayerRef.current = null;
    }, []); // No dependencies needed

    useEffect(() => {
        if (stop) {
            stopAll();
        }
    }, [stop, stopAll]);

    useEffect(() => {
        // 這個防護是解決重複觸發迴圈的關鍵。
        // Effect 仍然會在每次渲染時運行（因為 `data` 是一個物件），
        // 但這個檢查確保了只有在 `refresh` prop 真正改變時，聲音播放邏輯才會執行。
        if (refresh === lastProcessedRefresh.current) {
            return;
        }
        lastProcessedRefresh.current = refresh; // 立即更新，防止重複進入

        const playSound = (order) => {
            const url = soundFiles[order];
            if (!url) {
                console.warn(`MusicBox: No sound file found for order ${order}`);
                return;
            }

            const isSpecialGroup = soundStateNum.length > 4 && order < soundStateNum[4];
            const fadeTime = isSpecialGroup ? 0.5 : 0;

            const player = new Tone.Player({
                url: url,
                fadeOut: fadeTime,
                fadeIn: fadeTime,
                autostart: true, // Autostart after loading
            }).connect(meterRef.current);

            activePlayerRef.current = player; // Store the new player instance

            player.onstop = () => {
                console.log(`MusicBox: Sound ${order} stopped, stopping analysis.`);
                stopVolumeAnalysis(); // This resets opacity
                if (!player.disposed) {
                    player.dispose();
                }
                if (activePlayerRef.current === player) {
                    activePlayerRef.current = null;
                }
            };

            // For 'follow' mode, delay starting the volume analysis
            if (data.mode === 'follow' && onVolumeChange) {
                 // Use a short timeout to let the audio buffer start playing,
                 // avoiding an initial reading of -Infinity dB.
                setTimeout(() => {
                    // Check if this player is still the active one
                    if (activePlayerRef.current === player && !player.disposed) {
                        const peakVolume = peakVolumesRef.current[order] || 1.0;
                        startVolumeAnalysis(peakVolume);
                    }
                }, 50);
            }

            if ('volume' in data) {
                player.volume.value = data.volume;
            }
        };

        const stopNow = () => {
            const player = activePlayerRef.current;
            if (player && player.loaded && player.state !== 'stopped') {
                // When interrupting a 'follow' sound with another, we must not reset the opacity.
                // 1. Remove the onstop handler to prevent it from firing and resetting opacity.
                // 2. Explicitly stop the analysis loop without resetting opacity.
                player.onstop = () => {};
                stopVolumeAnalysis(false);
                player.stop();
                player.dispose(); // Clean up the interrupted player
                activePlayerRef.current = null;
            }
        };

        if (data.stop && data.stop !== '*') {
            stopAll();
            return; // 處理完畢，提前退出
        }

        // 如果元件未就緒、被停止或沒有有效資料，則不執行後續操作
        if (!peaksReady || stop || !data || Object.keys(data).length === 0) {
            return;
        }

        const order = calculateSoundOrder(data);

        if (order !== -1) {
            stopNow(); // Stop previous sound and its analysis via onstop callback

            const play = () => playSound(order);

            // 優先使用從 light effect 同步過來的精確延遲 (delayFix)，若無則使用自身的隨機延遲
            if (typeof data.delayFix === 'number') {
                setTimeout(play, data.delayFix);
            } else if (data.delay > 0) {
                setTimeout(play, Math.floor(Math.random() * data.delay));
            } else {
                play();
            }
        }
    }, [peaksReady, stop, data, refresh, stopAll, onVolumeChange, startVolumeAnalysis, stopVolumeAnalysis]);
    return(<></>);
}

export default MusicBoxMin;
