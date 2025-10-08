import 'standardized-audio-context';
// MediaQueryList 舊瀏覽器相容補丁（把 addEventListener 映到 addListener）
(function () {
  if (typeof window === 'undefined' || !window.matchMedia) return;

  var MQLProto = window.MediaQueryList && window.MediaQueryList.prototype;
  if (MQLProto && !MQLProto.addEventListener) {
    MQLProto.addEventListener = function (type, listener) {
      if (type === 'change') return this.addListener(listener);
    };
    MQLProto.removeEventListener = function (type, listener) {
      if (type === 'change') return this.removeListener(listener);
    };
  }

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

// Web Audio 事件 API 安全補丁
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

  ['AudioParam', 'AudioNode', 'BaseAudioContext', 'AudioContext'].forEach(tryPatch);

  if (!window.AudioContext && window.webkitAudioContext) {
    window.AudioContext = window.webkitAudioContext;
  }
})();

import React, {useState} from 'react';
import '../css/App.css';
import SocketHandler from './SocketHandler';
import LandPage from './LandPage';
import Fade from './Fade';
import { HashRouter as Router, Routes, Route } from 'react-router-dom'; 

import * as Tone from "tone";

function App() {
  const [landing, setLanding] = useState(true);
  const [speak, setSpeak] = useState(false);
  const selectStart = async () => {
    try {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
      await Tone.start();
      console.log("AudioContext started successfully!");

      const synth = new Tone.Synth().toMaster();
      synth.triggerAttackRelease("C4", "8n");
      setLanding(false);
      setSpeak(true);
  
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
