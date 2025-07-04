import React from 'react';
import AnimeBox from './AnimeBox';
// import MusicBox from './MusicBox';
import Fade from './Fade';
import MusicBoxMin from './MusicBox';

function EffectBox(props) {
    const { show, stop, refreshAnime, lightData, refreshMusic, soundData, opacity } = props;
    return (
        <div id="wrap">
            show: {show} lightData: {JSON.stringify(lightData)}
            <Fade show={show}>
                <AnimeBox refresh={refreshAnime} data={lightData} opacity={opacity || 0} />
            </Fade>
            <MusicBoxMin stop={stop} refresh={refreshMusic} data={soundData} />
        </div>
    );
}

export default EffectBox;
