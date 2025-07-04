import React, {useState} from 'react';
import '../css/App.css';
import SocketHandler from './SocketHandler';
import LandPage from './LandPage';
import Fade from './Fade';
import AnimeBoxTest from './AnimeBoxTest'; // 引入 AnimeBoxTest
import MusicBoxTest from './MusicBoxTest'; // 引入 MusicBoxTest
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
        <Route path="/animetest" element={<AnimeBoxTest />} />
        <Route path="/musictest" element={<MusicBoxTest />} />
        <Route path="/testfade" element={<FadeTest />} />
        <Route path="*" element={<h1>404: Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;
