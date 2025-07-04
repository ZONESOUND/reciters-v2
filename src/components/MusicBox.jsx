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

function MusicBoxMin({ stop, refresh, data }) {
    const playersRef = useRef([]);
    const nowOrderRef = useRef(0);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        console.log('MusicBox: Initializing and loading sounds...');
        
        const players = soundFiles.map((url, ind) => {
            //TODO: check if there is special group?
            const isSpecialGroup = soundStateNum.length > 4 && ind < soundStateNum[4];
            const fadeTime = isSpecialGroup ? 0.5 : 0;
            return new Tone.Player({
                url: url,
                fadeOut: fadeTime,
                fadeIn: fadeTime,
            }).toDestination();
        });

        playersRef.current = players;

        Tone.loaded().then(() => {
            console.log('MusicBox: All sounds loaded and ready!');
            setIsReady(true);
        }).catch(error => {
            console.error("MusicBox: Error loading sounds", error);
        });

        return () => {
            console.log('MusicBox: Cleaning up Tone.js players...');
            playersRef.current.forEach(player => {
                if (player.state === 'started') {
                    player.stop();
                }
                player.dispose();
            });
            playersRef.current = [];
            setIsReady(false);
        };
    }, []);

    const stopAll = useCallback(() => {
        if (!isReady) return;
        playersRef.current.forEach((player) => {
            if (player && player.loaded && player.state !== 'stopped') {
                player.stop();
            }
        });
        nowOrderRef.current = 0;
    }, [isReady]);

    useEffect(() => {
        if (stop) {
            stopAll();
        }
    }, [stop, stopAll]);

    useEffect(() => {
        if (!isReady || stop || !data || Object.keys(data).length === 0) {
            return;
        }

        const players = playersRef.current;

        const playSound = (order) => {
            if (players[order] && players[order].loaded) {
                console.log(`MusicBox: Playing sound ${order}`, players[order]);
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
                player.stop();
            }
        };

        if (data.stop && data.stop !== '*') {
            stopAll();
            return;
        }

        let order = -1;
        if (data.set && data.set > 0 && data.set < soundStateNum.length) {
            if ('order' in data) {
                if (data.orderTo && data.orderTo > data.order) {
                    const range = data.orderTo - data.order;
                    order = data.order + Math.floor(Math.random() * range);
                } else {
                    order = data.order;
                }
                order += soundStateNum[data.set - 1];
            }

        }

        if (order >= 0 && order < players.length) {
            stopNow();
            if ('volume' in data) setVolume(order, data.volume);
            if (data.delay > 0) {
                setTimeout(() => {
                    playSound(order);
                }, Math.floor(Math.random()*data.delay));
            } else playSound(order);
        }   
    }, [isReady, stop, data, refresh, stopAll]);
    return(<></>);
}

export default MusicBoxMin;