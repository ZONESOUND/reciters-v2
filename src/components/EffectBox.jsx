import React, { useState, useCallback } from 'react';
import AnimeBox from './AnimeBox';
// import MusicBox from './MusicBox';
import Fade from './Fade';
import MusicBoxMin from './MusicBox';

function EffectBox(props) {
    const { show, stop, refreshAnime, lightData, refreshMusic, soundData } = props;
    const [opacity, setOpacity] = useState(0);

    const handleVolumeChange = useCallback((volume) => {
        setOpacity(volume);
    }, []);

    return (
        <div id="wrap">
            <Fade show={show}>
                <AnimeBox refresh={refreshAnime} data={lightData} opacity={opacity} />
            </Fade>
            <MusicBoxMin stop={stop} refresh={refreshMusic} data={soundData} onVolumeChange={handleVolumeChange} />
        </div>
    );
}

export default EffectBox;
