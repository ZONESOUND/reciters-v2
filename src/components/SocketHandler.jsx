import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
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
    const [socketId, setSocketId] = useState(null); // State to store our own socket ID
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
    const hasConnectedOnceRef = useRef(false); // Ref to track if connection has been initiated
    const hasInitializedVoice = useRef(false); // Ref to track if the voice has been set at least once

    //TODO: check if stageEffect are used
    //const uuidRef = useRef(sessionStorage.getItem("StageEffectUUID") || genUUID());
    const uuidRef = useRef(genUUID());

    // Effect to emit voice config when launch transitions from true to false
    useEffect(() => {
        // Only emit when launch just became false (was true previously) and voice is set
        if (prevLaunch === true && !launch && voice) {
            console.log('emit voice!');
            emitData('speakConfig', {mode: 'changeVoice', voice: voice});
        }
    }, [launch, prevLaunch, voice]);

    // Effect to trigger random voice selection when the component starts
    useEffect(() => {
        // Trigger on the rising edge of the `start` prop
        if (props.start && !prevStart) {
            console.log('Start prop became true, triggering random voice selection.');
            setVoiceCommand({ value: 'random', trigger: Date.now() });
        }
    }, [props.start, prevStart]);

    // Effect to report voice changes back to the server
    useEffect(() => {
        // This effect triggers when the `voice` state is updated from the Speak component.
        // We check `hasInitializedVoice.current` to avoid sending an event on the initial mount.
        if (voice && hasInitializedVoice.current) {
            console.log('Voice changed, reporting to server:', voice);
            emitData('speakConfig', { mode: 'changeVoice', voice: voice, socketId: socketId });
        } else if (voice) {
            hasInitializedVoice.current = true;
        }
    }, [voice, socketId]); // It depends on `voice` to know when to run.

    // 將事件處理程序移至 useEffect 外部，並使用 useCallback 包裹，
    // 這可以確保它們在重新渲染之間保持穩定的引用，除非其依賴項發生變化。
    // 這是處理 React 中副作用（如設置監聽器）的最佳實踐。

    const handleDisconnect = useCallback(() => {
        setSocketConnect(false);
    }, []); // setSocketConnect 是穩定的

    const handleDebug = useCallback((data) => {
        console.log(data);
        if (data.mode === 'showForm') {
            setShowForm(data.value);
        }
    }, []); // setShowForm 是穩定的

    // 使用 useRef 來獲取 speak 狀態的最新值，這樣 handleSpeak 就不需要依賴 speak 狀態
    // 確保其引用穩定，避免 useEffect 頻繁重新註冊事件監聽器
    const speakRef = useRef(speak);
    useEffect(() => {
        speakRef.current = speak;
    }, [speak]);

    const handleSpeak = useCallback((data) => {
        console.log('handleSpeak received:', data);

        // 優先檢查：如果收到的 speak 事件沒有有效的文字內容，則直接忽略。
        // 這可以防止因空或無效的 speak 事件導致的狀態快速跳動。
        if (!data || !data.text || typeof data.text !== 'string' || data.text.trim() === '') {
            console.log('Ignoring speak event with empty or invalid text:', data);
            return;
        }
        if (speakRef.current) { // 使用 ref 來檢查最新的 speak 狀態
            console.log('Already speaking. Ignoring new request.');
            return;
        }
        console.log('Not speaking. Updating state to start speaking.', data);
        setSpeakData(data);
        setId(data.id);
        setSpeak(true); // 直接設置為 true
    }, []); // 移除 speak 依賴項，使 handleSpeak 引用穩定

    const handleSpeakConfig = useCallback((data) => {
        console.log(data);
        if (data.mode === 'showForm') {
            setShowForm(true);
        } else if (data.mode === 'hideForm') {
            setShowForm(false);
        } else if (data.mode === 'nowSpeak') {
            console.log('set now speak', data.data);
            setNowSpeak(data.data);
        } else if (data.mode === 'changeVoice') {
            // 廣播指令，要求所有客戶端隨機更換語音
            setVoiceCommand({ value: 'random', trigger: Date.now() });
        } else if (data.mode === 'assignVoice') {
            // 指派特定語音給單一或所有客戶端
            if (!data.socketId || data.socketId == '*' || data.socketId === socketId) {
                const target = !data.socketId || data.socketId === '*' ? 'all clients' : 'this client';
                const commandPayload = {
                    name: data.voice, // 'voice' 屬性被視為語音名稱
                    lang: data.lang   // 'lang' 屬性是語言代碼
                };

                Object.keys(commandPayload).forEach(key => (commandPayload[key] === undefined || commandPayload[key] == '*') && delete commandPayload[key]);
                console.log(`Assigning voice with criteria: ${JSON.stringify(commandPayload)} to ${target}.`);
                setVoiceCommand({ value: commandPayload, trigger: Date.now() });
            }
        } else if (data.mode === 'stop') {
            console.log('Received stop command. Stopping all speech.');
            setSpeak(false);
            setNowSpeak([]);
        }
    }, [setSpeak, setShowForm, setNowSpeak, socketId]);

    const handleSpeakOverAll = useCallback(() => {
        console.log('set now speak: no one');
        setNowSpeak([]);
    }, []);

    const handleControlData = useCallback((data) => {
        const rgbColors = ["255, 255, 255"];
        //TODO: set rgbColors anywhere?
        console.log(data);
        const handleLightDataInternal = (light) => {
            if (light.mode === "none") return {};
            if ("color" in light) {
                if (light.color === "*") delete light.color;
            }
            light.delay = Math.random() * light.delay;
            console.log('[handleLightDataInternal] light:', light);
            return light;
        };

        const handleSocketDataInternal = (d) => {
            var sound = 'sound' in d && d.sound !== '*' ? d.sound : {};
            var light = 'light' in d && d.light !== '*' ? handleLightDataInternal(d.light) : {};
            console.log('[handleSocketDataInternal] light:', light);
            console.log('[handleSocketDataInternal] sound:', sound);

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
            // The redundant call to setSoundData is removed.
            // The `sound` state is already correctly handled by the block above.
            // This prevents the effect in MusicBox from being triggered a second time.
            setLightData(jsonCopy(light));
            setRefreshAnime(prev => !prev);
        }
    }, []); // Empty dependency array as it doesn't depend on props or state
    
    // 使用 useMemo 建立一個衍生的「其他」發言者列表。
    // 這個列表只會在 nowSpeak 或我們自己的 socketId 改變時重新計算。
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
        setSpeak(false);
        console.log('speak over', id, 'voice:', voice);
        if (id !== -1) {
            // 透過將 id 和 voice 加入依賴陣列，這個 callback 會在其閉包中
            // 捕獲最新的 state 值。
            emitData('speakOver', {id: id, voice: voice});
        }
    }, [id, voice]); // 依賴項確保了 callback 在資料變更時是「新鮮」的。

    const changeVoiceCallback = useCallback((newVoice) => {
        setVoice(newVoice);
    }, []); // setVoice is stable
    
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