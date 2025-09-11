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
  const {toSpeak, data, speakOver, voiceCommand} = props;
  const prevToSpeak = usePrevious(toSpeak);
  const [revealSentence, setRevealSentence] = useState('');
  const [isRandomizing, setIsRandomizing] = useState(false);

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

    // Use onvoiceschanged for broader browser compatibility, as addEventListener
    // is not supported on the speechSynthesis object in all browsers.
    synth.onvoiceschanged = updateVoiceList;
    return () => {
      synth.onvoiceschanged = null;
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

    // Safety net timer in case onend/onerror doesn't fire.
    // Estimated speech duration + a 5-second buffer.
    const estimatedDuration = (text.length / 10) * 1000 * (1 / currentRate); // Rough estimate
    const safetyTimeout = Math.max(5000, estimatedDuration + 5000); // Minimum 5s
    const safetyTimer = setTimeout(() => {
      console.warn(`Speech safety timer triggered after ${safetyTimeout}ms. Forcing speakOver.`);
      speakOver();
      setRevealSentence("");
    }, safetyTimeout);

    const handleSpeechEnd = () => {
      clearTimeout(safetyTimer); // Clear the safety timer
      console.log('SpeechSynthesisUtterance onend/onerror triggered.');
      speakOver(); // Notify parent that speech is over
      setRevealSentence(""); // Clear the displayed sentence
    };

    utterThis.onend = handleSpeechEnd;
    utterThis.onerror = handleSpeechEnd;

    console.log('im speaking:', text, synth);
    synth.speak(utterThis);
  }, [synth, setRevealSentence, speakOver]); // Dependencies remain the same

  // This effect triggers speech only on the "rising edge" of the toSpeak prop.
  // It also handles stopping the speech on the "falling edge".
  useEffect(() => {
    // Rising edge: toSpeak becomes true, let's start speaking.
    if (toSpeak && !prevToSpeak) {
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
    } else if (!toSpeak && prevToSpeak) {
      // Falling edge: toSpeak becomes false (e.g., from a stop command)
      console.log('toSpeak became false. Cancelling any ongoing speech.');
      synth.cancel();
      // The onend event will not fire when we cancel, so we need to manually
      // clear the sentence that is displayed on screen.
      setRevealSentence("");
    }
  }, [toSpeak, prevToSpeak, data, voices, voiceIndex, pitch, rate, speakTextInternal, speakOver, setPitch, setRate, synth, setRevealSentence]);

  // This effect will rapidly change the voice index for a visual "shuffling" effect.
  useInterval(() => {
    if (voices.length > 0) {
        const newIndex = Math.floor(Math.random() * voices.length);
        setVoiceIndex(newIndex);
    }
  }, isRandomizing ? 100 : null); // Runs every 100ms only when isRandomizing is true.

  useEffect(()=>{
    // Only report the voice change up to the parent component when the voice has "settled",
    // i.e., not in the middle of the randomization animation.
    if (!isRandomizing && voices.length > 0 && voices[voiceIndex]) {
        console.log('Voice settled. Reporting to parent:', voices[voiceIndex].name);
        props.changeVoiceCallback({name:voices[voiceIndex].name, lang:voices[voiceIndex].lang});
    }
  }, [voiceIndex, voices, props.changeVoiceCallback, isRandomizing]);

  // Unified effect to handle all voice change commands from the server
  useEffect(() => {
    if (!voiceCommand || voices.length === 0) {
      return;
    }

    const { value } = voiceCommand;

    // Always start the randomization animation for visual feedback.
    setIsRandomizing(true);

    const animationTimer = setTimeout(() => {
        // First, stop the randomization animation. This will cause a re-render
        // which in turn stops the `useInterval` hook from firing again.
        setIsRandomizing(false);
        console.log('Voice selection animation stopped.');

        // By using a minimal timeout, we schedule the final voice selection to happen
        // *after* the re-render that stops the animation. This prevents a race condition
        // where the interval could fire one last time and override our specific selection.
        setTimeout(() => {
            // If a specific voice was requested, set it now.
            // If the command was 'random', we do nothing, leaving the last randomly selected voice.
            if (typeof value === 'object' && value !== null) {
                const { name, lang } = value;
                let newIndex = -1;

                if (name && lang) {
                    console.log(`Searching for voice with name "${name}" AND lang "${lang}".`);
                    newIndex = voices.findIndex(v => v.name === name && v.lang === lang);
                } else if (name) {
                    console.log(`Searching for a random voice containing the name "${name}".`);
                    const matchingVoices = voices.filter(v => v.name.includes(name));
                    if (matchingVoices.length > 0) {
                        // Select a random voice from the filtered list
                        const randomMatchingVoice = matchingVoices[Math.floor(Math.random() * matchingVoices.length)];
                        // Find the index of the randomly selected voice in the original voices array
                        newIndex = voices.indexOf(randomMatchingVoice);
                    }
                } else if (lang) {
                    console.log(`Searching for a random voice with lang "${lang}".`);
                    const matchingVoices = voices.filter(v => v.lang === lang);
                    if (matchingVoices.length > 0) {
                        const randomMatchingVoice = matchingVoices[Math.floor(Math.random() * matchingVoices.length)];
                        newIndex = voices.indexOf(randomMatchingVoice);
                    }
                }

                if (newIndex !== -1) {
                    console.log(`Found matching voice at index ${newIndex}. Setting it now.`);
                    setVoiceIndex(newIndex);
                } else {
                    console.warn(`No voice found matching criteria: ${JSON.stringify(value)}`);
                }
            }
        }, 10); // A small delay is enough to push this to the next event loop tick.
    }, 1000); // Animation duration: 1 second.

    // Cleanup function to clear the timer if the component unmounts or the command changes.
    return () => clearTimeout(animationTimer);
  }, [voiceCommand, voices]);

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
