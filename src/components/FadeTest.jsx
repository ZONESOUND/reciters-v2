import React, { useState } from 'react';
import Fade from './Fade'; 
import { FullDiv } from '../usages/cssUsage'; 

const FadeTest = () => {
    const [showContent, setShowContent] = useState(false);
    const [fadeSpeed, setFadeSpeed] = useState("0.5s");

    const toggleFade = () => {
        setShowContent(prev => !prev);
    };

    const handleSpeedChange = (e) => {
        setFadeSpeed(e.target.value);
    };

    return (
        <FullDiv $bgColor="lightgray" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
            <h1>Fade Component Test</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={toggleFade} style={{ padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer' }}>
                    {showContent ? 'Hide Content' : 'Show Content'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label htmlFor="fadeSpeed">Fade Speed:</label>
                    <input
                        id="fadeSpeed"
                        type="text"
                        value={fadeSpeed}
                        onChange={handleSpeedChange}
                        placeholder="e.g., 0.5s, 1s"
                        style={{ padding: '8px', fontSize: '1em' }}
                    />
                </div>
            </div>
            <div style={{ width: '300px', height: '200px', border: '2px solid blue', position: 'relative', overflow: 'hidden' }}>
                <Fade show={showContent} speed={fadeSpeed}>
                    <FullDiv $bgColor="lightblue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2em' }}>
                        Fading Content!
                    </FullDiv>
                </Fade>
            </div>
            <p>Current state: {showContent ? 'Visible' : 'Hidden'}</p>
        </FullDiv>
    );
};

export default FadeTest;