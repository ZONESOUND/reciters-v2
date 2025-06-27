import React from 'react';
import styled from 'styled-components';
import SiriWave from 'siriwave';
import '@/css/InfoPage.css';

// css styled component
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
        // speakingVoice 這個 prop 現在是由父組件 (SocketHandler) 預先過濾好的。
        // 我們只需要將列表格式化以進行顯示。
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
        <Wave start={props.sentence === '' ? false : true}/>
    </InfoWrapper>);
}

class Wave extends React.Component {
    constructor(props) {
        super(props);
        this.containerRef = React.createRef(); // Renamed for clarity, was this.myRef
        this.siriWaveInstance = null; // Store instance directly on the component
    }

    componentDidMount() {
        if (!this.containerRef.current) return;

        // Initialize SiriWave
        this.siriWaveInstance = new SiriWave({
            container: this.containerRef.current,
            style: 'ios9',
            width: 320,
            height: 100,
            speed: 0.2,
            amplitude: this.props.start ? 1 : 0, // Set initial amplitude based on props.start
            autostart: true, // Autostart with the defined amplitude
        });
    }

    componentDidUpdate(prevProps) {
        // Update amplitude if the 'start' prop changes
        if (this.siriWaveInstance && prevProps.start !== this.props.start) {
            if (this.props.start) {
                this.siriWaveInstance.setAmplitude(1); // Active amplitude
            } else {
                this.siriWaveInstance.setAmplitude(0); // Inactive amplitude
            }
        }
    }

    componentWillUnmount() {
        // Cleanup SiriWave instance
        if (this.siriWaveInstance) {
            this.siriWaveInstance.dispose(); // Assuming 'dispose' is the cleanup method
            this.siriWaveInstance = null;
        }
    }

    render() {
        return (<>
            <div ref={this.containerRef}></div>
        </>);
    }
  }

export default InfoPage;
