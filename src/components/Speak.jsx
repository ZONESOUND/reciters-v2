import React, {useState, useEffect, useCallback, useRef} from 'react';
import { useInterval, usePrevious } from '../usages/tool';
import InfoPage from './InfoPage';
import Fade from './Fade';
import {FullDiv} from '../usages/cssUsage';
import {excludeName} from '../usages/voiceUsage';

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
  const {toSpeak, data, speakOver, voiceCommand} = props;
  const prevToSpeak = usePrevious(toSpeak);
  const [revealSentence, setRevealSentence] = useState('');
  const isInitialMount = useRef(true);
  const voicesInitialized = useRef(false);
  const [isRandomizing, setIsRandomizing] = useState(false);

  useEffect(()=>{
    const updateVoiceList = () => {
      if (voicesInitialized.current) {
        console.log('onvoiceschanged fired again, but voices are already initialized. Ignoring.');
        return;
      }

      const { newVoices, newVoiceIndex } = getFilteredAndDefaultVoice(synth, excludeName);
      setVoices(newVoices);
      setVoiceIndex(newVoiceIndex);
      voicesInitialized.current = true;
      console.log('Voice list initialized.');
    };

    if (synth.getVoices().length > 0) {
        updateVoiceList();
    }

    synth.onvoiceschanged = updateVoiceList;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      synth.cancel();
    };
  }, []);

  const speakTextInternal = useCallback((text, currentPitch, currentRate, selectedVoice) => {
    if (!selectedVoice) {
        console.warn("No voice selected for speaking.");
        speakOver();
        return;
    }
    setRevealSentence(text);
    const utterThis = new SpeechSynthesisUtterance(text);
    utterThis.voice = selectedVoice;
    utterThis.pitch = currentPitch;
    utterThis.rate = currentRate;

    const estimatedDuration = (text.length / 10) * 1000 * (1 / currentRate);
    const safetyTimeout = Math.max(5000, estimatedDuration + 5000); 
    const safetyTimer = setTimeout(() => {
      console.warn(`Speech safety timer triggered after ${safetyTimeout}ms. Forcing speakOver.`);
      speakOver();
      setRevealSentence("");
    }, safetyTimeout);

    const handleSpeechEnd = () => {
      clearTimeout(safetyTimer);
      console.log('SpeechSynthesisUtterance onend/onerror triggered.');
      speakOver();
      setRevealSentence("");
    };

    utterThis.onend = handleSpeechEnd;
    utterThis.onerror = handleSpeechEnd;

    console.log('im speaking:', text, synth);
    synth.speak(utterThis);
  }, [synth, setRevealSentence, speakOver]); 

  useEffect(() => {
    if (toSpeak && !prevToSpeak) {
      if (!data.text || voices.length === 0) {
        console.warn("Speak command received, but no text or voices available. Aborting.");
        speakOver();
        return;
      }

      const finalPitch = data.pitch !== undefined ? data.pitch : pitch;
      const finalRate = data.rate !== undefined ? data.rate : rate;

      if (finalPitch !== pitch) setPitch(finalPitch);
      if (finalRate !== rate) setRate(finalRate);

      const selectedVoice = voices[voiceIndex];
      console.log('speakTextInternal:', data.text, finalPitch, finalRate, selectedVoice);
      speakTextInternal(data.text, finalPitch, finalRate, selectedVoice);
    } else if (!toSpeak && prevToSpeak) {
      console.log('toSpeak became false. Cancelling any ongoing speech.');
      synth.cancel();
      setRevealSentence("");
    }
  }, [toSpeak, prevToSpeak, data, voices, voiceIndex, pitch, rate, speakOver]);

  useInterval(() => {
    if (voices.length > 0) {
        setVoiceIndex(Math.floor(Math.random() * voices.length));
    }
  }, isRandomizing ? 100 : null);

  useEffect(()=>{
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isRandomizing && voices.length > 0 && voices[voiceIndex]) {
        console.log('Voice changed. Reporting to parent:', voices[voiceIndex].name);
        props.changeVoiceCallback({name:voices[voiceIndex].name, lang:voices[voiceIndex].lang});
    }
  }, [voiceIndex, isRandomizing]);

  useEffect(() => {
    if (!voiceCommand || voices.length === 0) {
      return;
    }

    const { value } = voiceCommand;

    setIsRandomizing(true);

    const animationTimer = setTimeout(() => {
        setIsRandomizing(false);
        console.log('Voice selection animation stopped.');

        setTimeout(() => {
            if (typeof value === 'object' && value !== null) {
                const { name, lang } = value;
                let newIndex = -1

                let matchingVoices = voices;
                if (name) {
                    console.log(`Filtering by name containing "${name}".`);
                    matchingVoices = matchingVoices.filter(v => v.name.includes(name));
                    console.log('name', matchingVoices);
                }
                if (lang) {
                    console.log(`Filtering by lang equal to "${lang}".`);
                    matchingVoices = matchingVoices.filter(v => v.lang === lang);
                    console.log(matchingVoices); 
                }

                if (matchingVoices.length > 0) {
                    const randomMatchingVoice = matchingVoices[Math.floor(Math.random() * matchingVoices.length)];
                    newIndex = voices.indexOf(randomMatchingVoice);
                }

                if (newIndex !== -1) {
                    console.log(`Found matching voice at index ${newIndex}. Setting it now.`);
                    const newVoice = voices[newIndex];
                    setVoiceIndex(newIndex);
                    console.log('Voice assigned by command. Reporting to parent:', newVoice.name);
                    props.changeVoiceCallback({name: newVoice.name, lang: newVoice.lang});
                } else {
                    console.warn(`No voice found matching criteria: ${JSON.stringify(value)}`);
                }
            }
        }, 10);
    }, 1000);

    return () => clearTimeout(animationTimer);
  }, [voiceCommand, voices, props.changeVoiceCallback]);

  let submitSpeak = (event) => {
    event.preventDefault();
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
      <InfoPage personName={`${personName}`} 
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
