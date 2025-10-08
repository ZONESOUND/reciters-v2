import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import SiriWave from 'siriwave';
import '@/css/InfoPage.css';

const InfoSpan = styled.span`
    margin: 1em;
    width: 80%;
    text-align: center;
    min-height: 1.2em;
    font-size: ${props => 
        props.fontSize === undefined ? '3em' : props.fontSize};
    font-weight: ${props => 
        props.fontWeight === undefined ? '200' : props.fontWeight};
    ${props => 
        props.color === undefined ? '' : 'color:'+props.color+';'}
    `;
const InfoWrapper = styled.div`
    margin: 0 auto;
    position: absolute;
    width: 100%;
    height: 100%;
    display:flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    `;


function InfoPage(props) {
    const maxLen = 10;
    let speaking = '';
    let num = 0;
    if (props.speakingVoice.length > 0) {
        console.log('speaking voice', props.speakingVoice);

        props.speakingVoice.forEach((speakingData)=>{
            let v = speakingData.voice;
            if (v == null || !v.name) return;
            if (num > maxLen) return;

            num++;
            if (num > 1) speaking += num === maxLen ? ' and ' : ', ';
            speaking += v.name;
        })
        if (num > 0) {
            speaking += num > 1 ? ' are ' : ' is ';
            speaking += 'speaking...';
        }
    }
    
    return (
    <InfoWrapper>
        <InfoSpan color={props.nameColor}>{props.personName}</InfoSpan>
        <InfoSpan color={'purple'} fontSize={'2em'} fontWeight={'300'}>
            {props.sentence === '' ? '' : `"${props.sentence}"`}
        </InfoSpan>
        <InfoSpan color={'gray'} fontSize={'1.5em'}>{speaking}</InfoSpan>
        <Wave start={props.sentence !== ''} />
    </InfoWrapper>);
}

/**
 * @param {object} props - The component props.
 * @param {boolean} props.start - Controls whether the wave is active (animating with amplitude) or inactive.
 */
function Wave({ start }) {
    const containerRef = useRef(null);
    const siriWaveInstanceRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        siriWaveInstanceRef.current = new SiriWave({
            container: containerRef.current,
            style: 'ios9',
            width: 320,
            height: 100,
            speed: 0.2,
            amplitude: 0,
            autostart: true,
        });

        return () => {
            if (siriWaveInstanceRef.current) {
                siriWaveInstanceRef.current.dispose();
                siriWaveInstanceRef.current = null;
            }
        };
    }, []);
    
    useEffect(() => {
        if (siriWaveInstanceRef.current) {
            const newAmplitude = start ? 1 : 0;
            siriWaveInstanceRef.current.setAmplitude(newAmplitude);
        }
    }, [start]);
    
    return <div ref={containerRef} style={{ width: '320px', height: '100px' }} />;
}

export default InfoPage;
