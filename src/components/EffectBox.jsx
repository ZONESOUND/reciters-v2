import React, { useState, useCallback } from 'react';
import AnimeBox from './AnimeBox';
// import MusicBox from './MusicBox';
import Fade from './Fade';
import MusicBoxMin from './MusicBox';

function EffectBox(props) {
    const { show, stop, refreshAnime, lightData, refreshMusic, soundData } = props;
    const [opacity, setOpacity] = useState(0);

    const handleVolumeChange = useCallback((volume) => {
        // `volume` 應該是一個 0 到 1 之間的值
        setOpacity(volume);
    }, []); // 使用 useCallback 並傳入空依賴陣列，確保此函式引用在重新渲染之間保持穩定。

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
