import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {connectSocket, onSocket, emitData, offSocket } from '@/usages/socketUsage.js';
import Speak from './Speak';
import Fade from './Fade';
import EffectBox from './EffectBox';
import {usePrevious, genUUID, jsonCopy} from '@/usages/tool';
import {FullDiv} from '@/usages/cssUsage';

function SocketHandler(props) {
    const [speak, setSpeak] = useState(false);
    const [id, setId] = useState(-1);
    const idRef = useRef(id);
    const [socketId, setSocketId] = useState(null); 
    const [launch, setLaunch] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [speakData, setSpeakData] = useState({});
    const [voice, setVoice] = useState(); 
    const [voiceCommand, setVoiceCommand] = useState(null);
    const [socketConnect, setSocketConnect] = useState(false);
    const [nowSpeak, setNowSpeak] = useState([]);
    const [lightData, setLightData] = useState({});
    const [soundData, setSoundData] = useState({});
    const [refreshAnime, setRefreshAnime] = useState(false);
    const [refreshMusic, setRefreshMusic] = useState(false);

    const prevLaunch = usePrevious(launch);
    const prevStart = usePrevious(props.start);
    const hasConnectedOnceRef = useRef(false); 

    //TODO: check if stageEffect are used
    //const uuidRef = useRef(sessionStorage.getItem("StageEffectUUID") || genUUID());
    const uuidRef = useRef(genUUID());

    useEffect(() => {
        idRef.current = id;
    }, [id]);

    // trigger random voice selection
    useEffect(() => {
        if (props.start && !prevStart) {
            console.log('Start prop became true, triggering random voice selection.');
            setVoiceCommand({ value: 'random', trigger: Date.now() });
        }
    }, [props.start, prevStart]);

    // report voice changes back to the server
    useEffect(() => {
        if (voice) {
            console.log('Voice changed, reporting to server:', voice);
            emitData('speakConfig', { mode: 'changeVoice', voice: voice, socketId: socketId });
        }
    }, [voice]);

    const handleDisconnect = useCallback(() => {
        setSocketConnect(false);
    }, []);

    const handleDebug = useCallback((data) => {
        console.log(data);
        if (data.mode === 'showForm') {
            setShowForm(data.value);
        }
    }, []);

    const speakRef = useRef(false);

    const handleSpeak = useCallback((data) => {
        console.log('handleSpeak received:', data);

        if (!data || !data.text || typeof data.text !== 'string' || data.text.trim() === '') {
            console.log('Ignoring speak event with empty or invalid text:', data);
            return;
        }
        if (speakRef.current) {
            console.log('Already speaking. Ignoring new request.');
            return;
        }
        console.log('Not speaking. Updating state to start speaking.', data);
        setSpeakData(data);
        setId(data.id);
        setSpeak(true);
        speakRef.current = true;
    }, []);

    const handleSpeakConfig = useCallback((data) => {
        if (data.mode === 'showForm') {
            setShowForm(true);
        } else if (data.mode === 'hideForm') {
            setShowForm(false);
        } else if (data.mode === 'nowSpeak') {
            console.log('  speak', data.data);
            setNowSpeak(data.data);
        } else if (data.mode === 'changeVoice') {
            setVoiceCommand({ value: 'random', trigger: Date.now() });
        } else if (data.mode === 'assignVoice') {
            if (!data.socketId || data.socketId == '*' || data.socketId === socketId) {
                const commandPayload = {
                    name: data.voice, 
                    lang: data.lang
                };
                if (commandPayload.name == undefined || commandPayload.name == '*') delete commandPayload.name;
                if (commandPayload.lang == undefined || commandPayload.lang == '*') delete commandPayload.lang;
                console.log(`Assigning voice with criteria: ${JSON.stringify(commandPayload)}.`);
                setVoiceCommand({ value: commandPayload, trigger: Date.now() });
            }
        } else if (data.mode === 'stop') {
            console.log('Received stop command. Stopping all speech.');
            speakRef.current = false;
            setSpeak(false);
            setNowSpeak([]);
        }
    }, [socketId]); 
    
    const handleSpeakOverAll = useCallback(() => {
        console.log('set now speak: no one');
        setNowSpeak([]);
    }, []);

    const handleControlData = useCallback((data) => {
        const rgbColors = ["255, 255, 255"];
        const handleLightDataInternal = (light) => {
            if (light.mode === "none") return {};
            if ("color" in light) {
                if (light.color === "*") delete light.color;
            }
            light.deviation = Math.random() * light.deviation;
            console.log('[handleLightDataInternal] light:', light);
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
            if ("deviation" in light && "order" in sound) {
                sound.delayFix = light.deviation;
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
            setLightData(jsonCopy(light));
            setRefreshAnime(prev => !prev);
        }
    }, []); 

    const otherSpeakers = useMemo(() => {
        console.log(socketId, nowSpeak)
        if (!socketId || !nowSpeak) return [];
        console.log(nowSpeak.filter(speaker => speaker.socketId !== socketId));
        return nowSpeak.filter(speaker => speaker.socketId !== socketId);
    }, [nowSpeak, socketId]);

    useEffect(()=> {
        // Socket connection: Use ref to prevent double connection in StrictMode
        if (!hasConnectedOnceRef.current) {
            connectSocket('/receiver', (socket)=>{ // 假設 connectSocket 會傳遞 socket 物件
                console.log('socket connect to server! My ID is:', socket.id);
                setSocketId(socket.id); // <-- 在這裡直接設定 socketId
                emitData('connected', {
                    uuid: uuidRef.current
                })
                setSocketConnect(true);
            });
            hasConnectedOnceRef.current = true;
        }
        // Event handlers should still be set up on each effect run

        // Register event listeners
        onSocket('disconnect', handleDisconnect);
        onSocket('debug', handleDebug);
        onSocket('speak', handleSpeak);
        onSocket('speakConfig', handleSpeakConfig);
        onSocket('controlData', handleControlData);
        onSocket('speakOverAll', handleSpeakOverAll)

        const beforeUnloadListener = (event) => {
            event.preventDefault();
            // emitData is safe to use here
            emitData('disconnected', { uuid: uuidRef.current });
            return event;
        };
        if (window.addEventListener)
            window.addEventListener("beforeunload", beforeUnloadListener);

        return () => {
            // Cleanup: Unregister event listeners
            // 為了確保正確移除監聽器，最好將處理程序函數本身傳遞給清理函數。
            // 這可以防止在 React.StrictMode 中或因其他原因導致 effect 重新運行時，出現重複的監聽器。
            offSocket('disconnect', handleDisconnect);
            offSocket('debug', handleDebug);
            offSocket('speak', handleSpeak);
            offSocket('speakConfig', handleSpeakConfig);
            offSocket('controlData', handleControlData);
            offSocket('speakOverAll', handleSpeakOverAll)
            window.removeEventListener("beforeunload", beforeUnloadListener);
        };
        
        
    }, [handleControlData, handleDisconnect, handleDebug, handleSpeak, handleSpeakConfig]);

    const speakOver = useCallback(() => {
        speakRef.current = false; // 立即解鎖
        setSpeak(false);
        const currentId = idRef.current; // Read the latest id from the ref
        console.log('speak over, id:', currentId);
        if (currentId !== -1) {
            emitData('speakOver', {id: currentId});
        }
    }, []); 

    const changeVoiceCallback = useCallback((newVoice) => {
        setVoice(newVoice);
    }, []);
    
    return (<>
        {/* Unused button: <button onClick={sendDebug}>Send Debug</button> */}
        {/* Unused button: <button onClick={sendChangeVoice}>Send Change Voice</button> */}
        <EffectBox
            show={socketConnect}
            stop={!socketConnect}
            lightData={lightData} soundData={soundData}
            refreshAnime={refreshAnime} refreshMusic={refreshMusic} />
        <Fade show={socketConnect}>
            <Speak toSpeak={speak} data={speakData} speakOver={speakOver} nowSpeak={otherSpeakers} voiceCommand={voiceCommand}
                    changeVoiceCallback={changeVoiceCallback} form={showForm} />
        </Fade>
        <Fade show={socketConnect===false}>
            <FullDiv $bgColor="black"><span>{'CONNECTING SERVER'}</span></FullDiv>
        </Fade>
        
    </>);
}

export default SocketHandler;