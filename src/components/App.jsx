import 'standardized-audio-context';
// --- MediaQueryList 舊瀏覽器相容補丁（把 addEventListener 映到 addListener）---
(function () {
  if (typeof window === 'undefined' || !window.matchMedia) return;

  // 直接補在原型上（若存在）
  var MQLProto = window.MediaQueryList && window.MediaQueryList.prototype;
  if (MQLProto && !MQLProto.addEventListener) {
    MQLProto.addEventListener = function (type, listener) {
      if (type === 'change') return this.addListener(listener);
    };
    MQLProto.removeEventListener = function (type, listener) {
      if (type === 'change') return this.removeListener(listener);
    };
  }

  // 少數環境沒有原型可補：包一層 matchMedia
  var _mm = window.matchMedia;
  window.matchMedia = function (query) {
    var mql = _mm.call(this, query);
    if (mql && !mql.addEventListener && mql.addListener) {
      mql.addEventListener = function (type, listener) {
        if (type === 'change') return mql.addListener(listener);
      };
      mql.removeEventListener = function (type, listener) {
        if (type === 'change') return mql.removeListener(listener);
      };
    }
    return mql;
  };
})();

// ---- Web Audio 事件 API 安全補丁 ----
(function () {
  var noop = function () {};
  function tryPatch(CtorName) {
    var Ctor = window[CtorName];
    if (Ctor && Ctor.prototype) {
      var proto = Ctor.prototype;
      if (!proto.addEventListener) proto.addEventListener = noop;
      if (!proto.removeEventListener) proto.removeEventListener = noop;
      if (!proto.dispatchEvent) proto.dispatchEvent = function () { return true; };
    }
  }

  // 在舊裝置上，這幾個常見對象常沒有事件 API
  ['AudioParam', 'AudioNode', 'BaseAudioContext', 'AudioContext'].forEach(tryPatch);

  // 舊 iOS 需要 webkit 前綴的回退
  if (!window.AudioContext && window.webkitAudioContext) {
    window.AudioContext = window.webkitAudioContext;
  }
})();

import React, {useState} from 'react';
import '../css/App.css';
import SocketHandler from './SocketHandler';
import LandPage from './LandPage';
import Fade from './Fade';
// import AnimeBoxTest from './AnimeBoxTest'; // 引入 AnimeBoxTest
// import MusicBoxTest from './MusicBoxTest'; // 引入 MusicBoxTest
// import FadeTest from './FadeTest'; // 引入 FadeTest
import { HashRouter as Router, Routes, Route } from 'react-router-dom'; // 引入路由組件

import * as Tone from "tone";

function App() {
  const [landing, setLanding] = useState(true);
  const [speak, setSpeak] = useState(false);
  const selectStart = async () => {
    try {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
      await Tone.start();
      console.log("AudioContext started successfully!");

      // 建立一個 synth 物件
      // const synth = new Tone.Synth().toDestination();
      // synth.triggerAttackRelease("C4", "8n");
      const synth = new Tone.Synth().toMaster(); // 13 沒有 toDestination，要用 toMaster()
      synth.triggerAttackRelease("C4", "8n");
      setLanding(false);
      setSpeak(true);
      
      // // 在 Tone.js 的時間軸上安排事件
      // Tone.Transport.scheduleOnce((time) => {
      //   // 在 'time' 這個精確的時間點播放聲音
      //   synth.triggerAttackRelease("C4", "8n", time);
      // }, 0); // 0 表示立即

      // 在音符播放結束後（"8n" 之後）安排下一個事件
      // Tone.Transport.scheduleOnce(() => {
      //   console.log("Test synth finished playing, now loading main components.");
      //   setLanding(false);
      //   setSpeak(true);
      //   synth.dispose(); // 清理 synth
      // }, "8n"); // "8n" 表示一個八分音符的時長

      // // 啟動 Transport
      // Tone.Transport.start();
    } catch (e) {
      console.error("Could not start AudioContext: ", e);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div>
            <Fade show={landing}>
              <LandPage select={selectStart}/>
            </Fade>
            <Fade show={speak}>
              <SocketHandler start={speak}/>
            </Fade>
          </div>
        } />
        {/* <Route path="/animetest" element={<AnimeBoxTest />} />
        <Route path="/musictest" element={<MusicBoxTest />} />
        <Route path="/testfade" element={<FadeTest />} /> 
        <Route path="*" element={<h1>404: Page Not Found</h1>} />*/}
      </Routes>
    </Router>
  );
}

export default App;
