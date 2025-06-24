import React, {useState, useEffect, useCallback, useRef} from 'react';
import {connectSocket, onSocket, emitData, offSocket } from '@/usages/socketUsage.js';
import Speak from './Speak';
import Fade from './Fade';
import EffectBox from './EffectBox';
import {usePrevious, useInterval, genUUID, jsonCopy} from '@/usages/tool';
import {FullDiv} from '@/usages/cssUsage';
//import MusicBoxMin from './MusicBox';

function SocketHandler(props) {
    const [speak, setSpeak] = useState(false);
    const [id, setId] = useState(-1);
    const [changeVoice, setChangeVoice] = useState(false);
    const [launch, setLaunch] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [speakData, setSpeakData] = useState({});
    const [voice, setVoice] = useState(); 
    const [socketConnect, setSocketConnect] = useState(false);
    const [nowSpeak, setNowSpeak] = useState([]);
    const [lightData, setLightData] = useState({});
    const [soundData, setSoundData] = useState({});
    const [refreshAnime, setRefreshAnime] = useState(false);
    const [refreshMusic, setRefreshMusic] = useState(false);

    const prevLaunch = usePrevious(launch);
    const hasConnectedOnceRef = useRef(false); // Ref to track if connection has been initiated

    //TODO: check if stageEffect are used
    const uuidRef = useRef(sessionStorage.getItem("StageEffectUUID") || genUUID());

    const changeVoiceEffect = useCallback(() => {
        setLaunch(true);
        setTimeout(()=>{
            setLaunch(false);
        }, 2000);
    }, [setLaunch]);

    useEffect(()=>{
        //if (props.start && socketConnect) {
        if (socketConnect) {
            changeVoiceEffect();
        }
    }, [socketConnect, changeVoiceEffect])

    // Effect to emit voice config when launch transitions from true to false
    useEffect(() => {
        // Only emit when launch just became false (was true previously) and voice is set
        if (prevLaunch === true && !launch && voice) {
            console.log('emit voice!');
            emitData('speakConfig', {mode: 'changeVoice', voice: voice});
        }
    }, [launch, prevLaunch, voice]);

    const handleControlData = useCallback((data) => {
        const rgbColors = ["255, 255, 255"];

        const handleLightDataInternal = (light) => {
            if (light.mode === "none") return {};
            if ("color" in light) {
                if (light.color === "*") delete light.color;
            }
            light.delay = Math.random() * light.delay;
            return light;
        };

        const handleSocketDataInternal = (d) => {
            var sound = 'sound' in d && d.sound !== '*' ? d.sound : {};
            var light = 'light' in d && d.light !== '*' ? handleLightDataInternal(d.light) : {};

            if (!("color" in light) && JSON.stringify(light) !== "{}" && "order" in sound) {
                light.color = rgbColors[sound.order % rgbColors.length];
            }
            if ("color" in light && "order" in sound) {
                if (light.color === "*") {
                    light.color = rgbColors[sound.order % rgbColors.length];
                }
            }
            if ("delay" in light && "order" in sound) {
                sound.delayFix = light.delay;
            }
            if ("mode" in light && "order" in sound) {
                sound.mode = light.mode;
            }
            if ("mode" in light && "stop" in sound) {
                if (light.mode === "follow") light = {};
            }
            return { light: light, sound: sound };
        };

        const { light, sound } = handleSocketDataInternal(data);

        if (JSON.stringify(sound) !== "{}") {
            setSoundData(jsonCopy(sound));
            setRefreshMusic(prev => !prev);
        }
        if (JSON.stringify(light) !== "{}") {
            // The original code set soundData here too, preserving that behavior.
            setSoundData(jsonCopy(sound)); 
            setLightData(jsonCopy(light));
            setRefreshAnime(prev => !prev);
        }
    }, []); // Empty dependency array as it doesn't depend on props or state
    
    useEffect(()=> {
        // Socket connection: Use ref to prevent double connection in StrictMode
        if (!hasConnectedOnceRef.current) {
            connectSocket('/receiver', ()=>{
                console.log('socket connect to server!');
                emitData('connected', {
                    uuid: uuidRef.current
                })
                setSocketConnect(true);
            });
            hasConnectedOnceRef.current = true;
        }
        // Event handlers should still be set up on each effect run

        // Event handlers
        const handleDisconnect = () => {
            setSocketConnect(false);
        };

        const handleDebug = (data) => {
            console.log(data);
            if (data.mode === 'showForm') {
                setShowForm(data.value);
            }
        };

        const handleSpeak = (data) => {
            console.log('handleSpeak', data, data.id, speak);
            setSpeak(prevSpeak => {
                console.log('prevSpeak', prevSpeak);
                if (!prevSpeak) {
                    console.log('speak!', data);
                    setSpeakData(data);
                    setId(data.id);
                    return true;
                }
                // If already speaking, ignore new request (or handle as a queue if needed)
                return prevSpeak; 
            });
        };

        const handleSpeakConfig = (data) => {
            console.log(data);
            if (data.mode === 'changeVoice') {
                changeVoiceEffect();
            } else if (data.mode === 'showForm') {
                setShowForm(true);
            } else if (data.mode === 'hideForm') {
                setShowForm(false);
            } else if (data.mode === 'nowSpeak') {
                setNowSpeak(data.data);
            }
        };

        // Register event listeners
        onSocket('disconnect', handleDisconnect);
        onSocket('debug', handleDebug);
        onSocket('speak', handleSpeak);
        onSocket('speakConfig', handleSpeakConfig);
        onSocket('controlData', handleControlData);

        const beforeUnloadListener = (event) => {
            event.preventDefault();
            // emitData is safe to use here
            emitData('disconnected', { uuid: uuidRef.current });
            return event;
        };
        window.addEventListener("beforeunload", beforeUnloadListener);

        return () => {
            // Cleanup: Unregister event listeners
            offSocket('disconnect');
            offSocket('debug');
            offSocket('speak');
            offSocket('speakConfig');
            offSocket('controlData');
            window.removeEventListener("beforeunload", beforeUnloadListener);
        };
    }, [handleControlData]); // Add handleControlData to dependency array

    useInterval(() => {
        setChangeVoice(prev => !prev);
    }, launch ? 100 : null);

    let sendDebug = () => {
        emitData('debug', 'testing');
    }
    let sendChangeVoice = () => {
        console.log('send change voice');
        setChangeVoice(!changeVoice);
    }

    const speakOver = useCallback(() => {
        setSpeak(false);
        console.log('speak over', id);
        if (id !== -1) {
            emitData('speakOver', {id: id, voice: voice});
        }
    }, [id, voice]); // setSpeak is stable, emitData is an import

    const changeVoiceCallback = useCallback((newVoice) => {
        setVoice(newVoice);
    }, []); // setVoice is stable
    
    return (<>
        {/* Unused button: <button onClick={sendDebug}>Send Debug</button> */}
        {/* Unused button: <button onClick={sendChangeVoice}>Send Change Voice</button> */}
        <EffectBox
            show={socketConnect && !speak}
            stop={speak}
            lightData={lightData} soundData={soundData}
            refreshAnime={refreshAnime} refreshMusic={refreshMusic}
        />
        <Fade show={socketConnect}>
            <Speak toSpeak={speak} data={speakData} speakOver={speakOver} 
                    changeVoice={changeVoice} changeVoiceCallback={changeVoiceCallback}
                    nowSpeak={nowSpeak} form={showForm}/>
        </Fade>
        <Fade show={socketConnect===false}>
            <FullDiv $bgColor="black"><span>{'CONNECTING SERVER'}</span></FullDiv>
        </Fade>
        
    </>);
}

export default SocketHandler;