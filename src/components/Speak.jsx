import React, {useState, useEffect, useCallback} from 'react';
import { useInterval, usePrevious } from '../usages/tool';
import InfoPage from './InfoPage';
import Fade from './Fade';
import {FullDiv} from '../usages/cssUsage';
import {excludeName} from '../usages/voiceUsage';

// Helper function to filter voices and determine a default index
const getFilteredAndDefaultVoice = (synthInstance, excludeNamesSet) => {
  const allVoices = synthInstance.getVoices();
  if (!allVoices || allVoices.length === 0) {
    return { newVoices: [], newVoiceIndex: 0 };
  }

  const filteredVoices = [];
  const seenNames = new Set();
  let defaultVoiceIdx = -1;

  for (let i = 0; i < allVoices.length; i++) {
    const voice = allVoices[i];
    // Ensure voice and voice.name are defined before accessing properties
    if (voice && voice.name && !excludeNamesSet.has(voice.name) && !seenNames.has(voice.name)) {
      filteredVoices.push(voice);
      seenNames.add(voice.name);
      if (voice.default && defaultVoiceIdx === -1) {
        defaultVoiceIdx = filteredVoices.length - 1;
      }
    }
  }
  
  if (defaultVoiceIdx === -1 && filteredVoices.length > 0) {
    defaultVoiceIdx = 0;
  } else if (filteredVoices.length === 0) {
    defaultVoiceIdx = 0; 
  }

  return { newVoices: filteredVoices, newVoiceIndex: defaultVoiceIdx };
};

function Speak(props) {
  const synth = window.speechSynthesis;  
  const [voices, setVoices] = useState([]);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  const {toSpeak, data, changeVoice, speakOver} = props;
  const prevToSpeak = usePrevious(toSpeak);
  const prevChangeVoice = usePrevious(changeVoice);
  const [revealSentence, setRevealSentence] = useState('');

  // Effect for initializing and updating voices
  useEffect(()=>{
    const updateVoiceList = () => {
      const { newVoices, newVoiceIndex } = getFilteredAndDefaultVoice(synth, excludeName);
      setVoices(newVoices);
      setVoiceIndex(newVoiceIndex);
    };

    if (synth.getVoices().length > 0) {
        updateVoiceList();
    }

    synth.addEventListener('voiceschanged', updateVoiceList);
    return () => {
      synth.removeEventListener('voiceschanged', updateVoiceList);
    };
  }, [synth]); // excludeName is a constant import

  // Cleanup effect to cancel any ongoing speech when the component unmounts.
  // This prevents orphaned speech synthesis processes.
  useEffect(() => {
    return () => {
      synth.cancel();
    };
  }, [synth]);

  const speakTextInternal = useCallback((text, currentPitch, currentRate, selectedVoice) => {
    if (!selectedVoice) {
        console.warn("No voice selected for speaking.");
        // If we can't speak, immediately tell the parent we are done.
        speakOver();
        return;
    }
    setRevealSentence(text);
    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.voice = selectedVoice;
    utterThis.pitch = currentPitch;
    utterThis.rate = currentRate;

    // Add an event listener for when the speech ends
    utterThis.onend = () => {
      console.log('SpeechSynthesisUtterance onend triggered.');
      speakOver(); // Notify parent that speech is over
      setRevealSentence(""); // Clear the displayed sentence
    };

    console.log('im speaking:', text, synth);
    synth.speak(utterThis);
  }, [synth, setRevealSentence, speakOver]); // Dependencies remain the same

  // This effect triggers speech only on the "rising edge" of the toSpeak prop.
  useEffect(() => {
    // We only want to act when `toSpeak` becomes true.
    if (!toSpeak || prevToSpeak) {
      return;
    }

    // Guard against missing data or voices.
    if (!data.text || voices.length === 0) {
      console.warn("Speak command received, but no text or voices available. Aborting.");
      speakOver();
      return;
    }

    // Determine pitch and rate, and update local state if new values are provided.
    // This keeps the form in sync with the last spoken parameters.
    const finalPitch = data.pitch !== undefined ? data.pitch : pitch;
    const finalRate = data.rate !== undefined ? data.rate : rate;

    if (finalPitch !== pitch) setPitch(finalPitch);
    if (finalRate !== rate) setRate(finalRate);

    const selectedVoice = voices[voiceIndex];
    console.log('speakTextInternal:', data.text, finalPitch, finalRate, selectedVoice);
    speakTextInternal(data.text, finalPitch, finalRate, selectedVoice);

  }, [toSpeak, prevToSpeak, data, voices, voiceIndex, pitch, rate, speakTextInternal, speakOver, setPitch, setRate]);

  useEffect(()=>{
    if (prevChangeVoice !== changeVoice && voices.length > 0) {
      setVoiceIndex(Math.floor(Math.random() * voices.length));
    }
  }, [changeVoice, prevChangeVoice, voices, setVoiceIndex]);

  useEffect(()=>{
    if (voices.length > 0 && voices[voiceIndex]) {
        props.changeVoiceCallback({name:voices[voiceIndex].name, lang:voices[voiceIndex].lang});
    }
  }, [voiceIndex, voices, props.changeVoiceCallback]);

  let submitSpeak = (event) => {
    event.preventDefault();
    // This test function speaks "hello" with the current settings
    if (voices.length > 0 && voices[voiceIndex]) {
      speakTextInternal('hello', pitch, rate, voices[voiceIndex]);
    }
  };

  const formProps = {
    onSubmitF: submitSpeak,
    voiceIndex: voiceIndex, 
    voiceOnChanged: setVoiceIndex, 
    voices: voices, 
    pitch: pitch, 
    rate: rate, 
    pitchOnChanged: setPitch, 
    rateOnChanged: setRate
  }
  const currentVoice = voices[voiceIndex];
  let personName = currentVoice ? `${currentVoice.name} (${currentVoice.lang})` : '';

  return (
    <>
      {props.form && <SpeakForm {...formProps}/>}
      <Fade show={toSpeak} speed={'0.3s'}>
        <FullDiv $bgColor="white" />
      </Fade>
      <InfoPage personName={`${personName} ${revealSentence}`} 
        sentence={revealSentence} 
        speakingVoice={props.nowSpeak} 
        nameColor={toSpeak ? 'black': 'white'} />
    </>
  );
}

function SpeakForm(props) {
  const {onSubmitF, voiceIndex, 
        voiceOnChanged, voices, pitch, rate, 
        pitchOnChanged, rateOnChanged} = props;
  return (
    <form onSubmit={onSubmitF}>
      <select value={voiceIndex} onChange={(e) => {voiceOnChanged(e.target.value)}}>
        {voices.map((voice, index) => {
          return <option key={voice.name + index} value={index}>{`${voice.name} (${voice.lang})`}</option>
        })}
      </select>
      <br/>
      <label htmlFor='pitch'>pitch</label>
      <input type='number' step={0.1} value={pitch} onChange={(e)=>{pitchOnChanged(parseFloat(e.target.value))}} id='pitch' />
      <br/>
      <label htmlFor='rate'>rate</label>
      <input type='number' step={0.1} value={rate}  onChange={(e)=>{rateOnChanged(parseFloat(e.target.value))}} id='rate'/>
      <input type='submit'></input>
    </form>
  )
}

export default Speak;
