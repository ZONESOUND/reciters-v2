import React, {useState} from 'react';
import '../css/App.css';
import SocketHandler from './SocketHandler';
import LandPage from './LandPage';
import Fade from './Fade';
import AnimeBoxTest from './AnimeBoxTest'; // 引入 AnimeBoxTest
import FadeTest from './FadeTest'; // 引入 FadeTest
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // 引入路由組件
import * as Tone from "tone";

function App() {
  const [landing, setLanding] = useState(true);
  const [speak, setSpeak] = useState(false);
  let selectStart= () => {
    setLanding(false);
    setSpeak(true);

    //not sure where to put this...
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    Tone.start();
    const synth = new Tone.Synth();
    synth.oscillator.type = "sine";
    synth.toDestination();
    synth.triggerAttackRelease("C4", "16n");
  }

  return ( // 使用 Router 包裹整個應用
    <Router>
      <Routes>
        {/* 主頁路由 */}
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
        {/* AnimeBoxTest 頁面路由 */}
        <Route path="/animetest" element={<AnimeBoxTest />} />
        {/* FadeTest 頁面路由 */}
        <Route path="/testfade" element={<FadeTest />} />
        {/* 新增一個 "Not Found" 路由，用於匹配所有其他未定義的路徑 */}
        <Route path="*" element={<h1>404: Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
