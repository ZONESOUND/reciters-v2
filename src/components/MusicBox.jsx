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
    const playersRef = useRef([]);
    const meterRef = useRef(null);
    const animationFrameId = useRef(null);
    const nowOrderRef = useRef(0);
    const peakVolumesRef = useRef([]); // Ref to store peak volumes for each sound
    const lastProcessedRefresh = useRef(null); // Ref 來追蹤最後處理過的觸發器
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        console.log('MusicBox: Initializing and loading sounds...');
        
        const meter = new Tone.Meter();
        meterRef.current = meter;

        const players = soundFiles.map((url, ind) => {
            // 前 4 組音效被指定為「特殊」組，並獲得淡入淡出效果。
            const isSpecialGroup = soundStateNum.length > 4 && ind < soundStateNum[4]; // soundStateNum[4] 是第 5 組的起始索引
            const fadeTime = isSpecialGroup ? 0.5 : 0;
            return new Tone.Player({
                url: url,
                fadeOut: fadeTime,
                fadeIn: fadeTime,
            }).connect(meter);
        });
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

                playersRef.current = players;
                setIsReady(true);
                console.log('MusicBox: All sounds loaded and ready!');
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
            playersRef.current.forEach(player => {
                if (player && !player.disposed) {
                    if (player.state === 'started') {
                        player.stop();
                    }
                    player.dispose();
                }
            });
            playersRef.current = [];
            if (meterRef.current && !meterRef.current.disposed) {
                meterRef.current.dispose();
            }
            setIsReady(false);
        };
    }, []);

    const stopVolumeAnalysis = useCallback(() => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
        if (onVolumeChange) {
            onVolumeChange(0);
        }
    }, [onVolumeChange]);

    const startVolumeAnalysis = useCallback((peakVolume) => {
        // Stop any previous loop to be safe
        stopVolumeAnalysis(); 
        
        if (!onVolumeChange || !meterRef.current) return;

        // Convert peak amplitude (0-1) to dB. Add a small epsilon to avoid log(0).
        // A peak of 1.0 is 0 dB. A peak of 0.5 is approx -6 dB.
        const maxDb = 20 * Math.log10(peakVolume + Number.EPSILON);

        const analyze = () => {
            if (!meterRef.current || meterRef.current.disposed) return;

            // 輔助函式：將 dB 值從一個範圍映射到 0-1 的範圍
            const mapVolumeToOpacity = (db) => {
                // 1. 定義你的音量工作範圍 (單位: dB)
                const MIN_DB = -60;
                // 使用從音檔分析出的動態峰值，並加上一個小的餘裕空間(e.g., 3dB)
                const MAX_DB = maxDb;

                // 2. 將 dB 值限制在你的工作範圍內
                const clampedDb = Math.max(MIN_DB, Math.min(db, MAX_DB));

                // 3. 將被限制的 dB 值線性映射到 0-1 的範圍
                const normalized = (clampedDb - MIN_DB) / (MAX_DB - MIN_DB);

                // 4. (可選) 應用一個曲線來讓視覺效果更好。
                //    例如，平方 (pow(2)) 會讓燈光對較大的聲音反應更劇烈。
                //    你可以嘗試 1 (線性), 1.5, 2 等值來找到喜歡的效果。
                return Math.pow(normalized, 2);
            };

            const db = meterRef.current.getValue();
            const volume = mapVolumeToOpacity(db);
            onVolumeChange(volume);
            animationFrameId.current = requestAnimationFrame(analyze);
        };
        animationFrameId.current = requestAnimationFrame(analyze);
    }, [onVolumeChange, stopVolumeAnalysis]);

    const stopAll = useCallback(() => {
        if (!isReady) return;
        playersRef.current.forEach((player) => {
            if (player && player.loaded && player.state !== 'stopped') {
                // player.stop() will trigger the onstop callback which handles analysis stopping
                player.stop();
            }
        });
        nowOrderRef.current = 0;
    }, [isReady]); // No need to add stopVolumeAnalysis here, onstop handles it

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

        const players = playersRef.current;

        const playSound = (order) => {
            if (players[order] && players[order].loaded) {
                console.log(`MusicBox: Playing sound ${order}`, players[order]);

                // If mode is 'follow', set up volume analysis
                const peakVolume = peakVolumesRef.current[order] || 1.0; // Fallback to 1.0
                if (data.mode === 'follow' && onVolumeChange) {
                    startVolumeAnalysis(peakVolume);
                    // When the sound finishes playing naturally or is stopped, stop the analysis
                    players[order].onstop = () => {
                        console.log(`MusicBox: Sound ${order} stopped, stopping analysis.`);
                        stopVolumeAnalysis();
                        players[order].onstop = () => {}; // Reset to a no-op to prevent crashes
                    };
                }

                players[order].start();
                nowOrderRef.current = order;
            } else {
                console.warn(`MusicBox: Sound ${order} not loaded or does not exist!`);
            }
        };

        const setVolume = (order, volume) => {
            if (players[order] && players[order].loaded) {
                players[order].volume.value = volume;
            }
        };

        const stopNow = () => {
            const player = players[nowOrderRef.current];
            if (player && player.loaded && player.state !== 'stopped') {
                player.stop(); // This will trigger the onstop callback, stopping analysis
            }
        };

        if (data.stop && data.stop !== '*') {
            stopAll();
            return; // 處理完畢，提前退出
        }

        // 如果元件未就緒、被停止或沒有有效資料，則不執行後續操作
        if (!isReady || stop || !data || Object.keys(data).length === 0) {
            return;
        }

        const order = calculateSoundOrder(data);

        if (order !== -1) {
            stopNow(); // Stop previous sound and its analysis via onstop callback
            if ('volume' in data) setVolume(order, data.volume);

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
    }, [isReady, stop, data, refresh, stopAll, onVolumeChange, startVolumeAnalysis, stopVolumeAnalysis]);
    return(<></>);
}

export default MusicBoxMin;