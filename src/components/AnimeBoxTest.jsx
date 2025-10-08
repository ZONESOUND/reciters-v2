import React, { useState, useCallback } from 'react';
import AnimeBox from './AnimeBox';

const styles = {
    container: {
        display: 'flex',
        fontFamily: 'sans-serif',
        padding: '20px',
        height: '100vh',
        boxSizing: 'border-box',
    },
    controls: {
        width: '350px',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        marginRight: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        overflowY: 'auto',
    },
    preview: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: '1px solid #eee',
        position: 'relative', 
    },
    controlGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    label: {
        fontWeight: 'bold',
        marginBottom: '5px',
    },
    input: {
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ddd',
    },
    button: {
        padding: '10px 15px',
        border: 'none',
        backgroundColor: '#007bff',
        color: 'white',
        borderRadius: '4px',
        cursor: 'pointer',
        marginTop: '10px',
    },
    note: {
        fontSize: '0.8em',
        color: '#666',
        marginTop: '2px',
    }
};

function AnimeBoxTest() {
    const [formData, setFormData] = useState({
        mode: 'blink',
        color: '255, 105, 180', 
        alpha: 1,
        duration: 500,
        delay: 0,
        endDelay: 500,
        loopTime: 1,
        noise: true, 
        noiseIntensity: 0.1,
        noiseSize: 150,

    });
    const [formOpacity, setFormOpacity] = useState(0.5);

    const [activeData, setActiveData] = useState(null);
    const [activeOpacity, setActiveOpacity] = useState(formOpacity);

    const [refresh, setRefresh] = useState(false);
    
    const handleDataChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : (type === 'number' || type === 'range' ? Number(value) : value),

        }));
    }, []);

    const handleRefresh = () => {
        setActiveData(formData);
        setActiveOpacity(formOpacity);
        setRefresh(r => !r);
    };

    return (
        <div style={styles.container}>
            <div style={styles.controls}>
                <h2>AnimeBox Controls</h2>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="mode">Mode</label>
                    <select id="mode" name="mode" value={formData.mode} onChange={handleDataChange} style={styles.input}>
                        <option value="blink">blink</option>
                        <option value="light">light</option>
                        <option value="follow">follow</option>
                        <option value="default">default (single play)</option>
                    </select>
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="color">Color (RGB string)</label>
                    <input id="color" name="color" type="text" value={formData.color} onChange={handleDataChange} style={styles.input} />
                    <div style={styles.note}>e.g., "255, 0, 0"</div>
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="alpha">Alpha (for non-follow modes)</label>
                    <input id="alpha" name="alpha" type="number" min="0" max="1" step="0.1" value={formData.alpha} onChange={handleDataChange} style={styles.input} />
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="duration">Duration (ms)</label>
                    <input id="duration" name="duration" type="number" value={formData.duration} onChange={handleDataChange} style={styles.input} />
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="delay">Delay (ms)</label>
                    <input id="delay" name="delay" type="number" value={formData.delay} onChange={handleDataChange} style={styles.input} />
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="endDelay">End/Repeat Delay (ms)</label>
                    <input id="endDelay" name="endDelay" type="number" value={formData.endDelay} onChange={handleDataChange} style={styles.input} />
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="loopTime">Loop Time</label>
                    <input id="loopTime" name="loopTime" type="number" min="1" value={formData.loopTime} onChange={handleDataChange} style={styles.input} />
                </div>

                <div style={styles.controlGroup}>
                    <label style={{...styles.label, display: 'flex', alignItems: 'center', gap: '10px'}} htmlFor="noise">
                        <span>Noise Effect</span>
                        <input id="noise" name="noise" type="checkbox" checked={formData.noise} onChange={handleDataChange} />
                    </label>
                </div>


                {formData.noise && (
                    <>
                        <div style={styles.controlGroup}>
                            <label style={styles.label} htmlFor="noiseIntensity">Noise Intensity ({formData.noiseIntensity.toFixed(2)})</label>
                            <input id="noiseIntensity" name="noiseIntensity" type="range" min="0" max="1" step="0.05" value={formData.noiseIntensity} onChange={handleDataChange} style={{...styles.input, padding: 0}} />
                        </div>

                        <div style={styles.controlGroup}>
                            <label style={styles.label} htmlFor="noiseSize">Noise Size ({formData.noiseSize}px)</label>
                            <input id="noiseSize" name="noiseSize" type="range" min="50" max="500" step="10" value={formData.noiseSize} onChange={handleDataChange} style={{...styles.input, padding: 0}} />
                        </div>
                    </>
                )}
                
                <hr />

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="opacity">Opacity (for 'follow' mode)</label>
                    <span>{formOpacity.toFixed(2)}</span>
                    <input id="opacity" name="opacity" type="range" min="0" max="1" step="0.01" value={formOpacity} onChange={(e) => setFormOpacity(parseFloat(e.target.value))} style={{...styles.input, padding: 0}} />
                </div>

                <button onClick={handleRefresh} style={styles.button}>Trigger Refresh (Re-run Animation)</button>
            </div>

            <div style={styles.preview}>
                {activeData ? (
                    <AnimeBox data={activeData} opacity={activeOpacity} refresh={refresh} />
                ) : (
                    <div style={styles.note}>點擊 "Trigger Refresh" 按鈕開始動畫</div>
                )}
            </div>
        </div>
    );
}

export default AnimeBoxTest;