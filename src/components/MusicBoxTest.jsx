import React, { useState, useCallback } from 'react';
import MusicBoxMin from './MusicBox';

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
        flexDirection: 'column',
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
    stopButton: {
        backgroundColor: '#dc3545',
    },
    note: {
        fontSize: '0.8em',
        color: '#666',
        marginTop: '2px',
    }
};

function MusicBoxTest() {
    const [formData, setFormData] = useState({
        set: 1,
        order: 0,
        orderTo: 1,
        volume: 0,
        delay: 0,
        stop: false,
    });

    const [activeData, setActiveData] = useState({});
    const [refresh, setRefresh] = useState(false);
    const [stopSignal, setStopSignal] = useState(false);

    const handleDataChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : Number(value),
        }));
    }, []);

    const handleTriggerSound = () => {
        setActiveData(formData);
        setStopSignal(false); 
        setRefresh(r => !r); 
    };

    const handleStopAll = () => {
        setStopSignal(true);
        setRefresh(r => !r); 
    };

    return (
        <div style={styles.container}>
            <div style={styles.controls}>
                <h2>MusicBox Controls</h2>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="set">Set (1-4)</label>
                    <input id="set" name="set" type="number" min="1" max="4" value={formData.set} onChange={handleDataChange} style={styles.input} />
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="order">Order (from)</label>
                    <input id="order" name="order" type="number" min="0" value={formData.order} onChange={handleDataChange} style={styles.input} />
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="orderTo">Order To (random range)</label>
                    <input id="orderTo" name="orderTo" type="number" min="0" value={formData.orderTo} onChange={handleDataChange} style={styles.input} />
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="volume">Volume (-20 to 20 dB)</label>
                    <input id="volume" name="volume" type="range" min="-20" max="20" step="1" value={formData.volume} onChange={handleDataChange} />
                    <span>{formData.volume} dB</span>
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label} htmlFor="delay">Random Delay Max (ms)</label>
                    <input id="delay" name="delay" type="number" min="0" value={formData.delay} onChange={handleDataChange} style={styles.input} />
                </div>

                <button onClick={handleTriggerSound} style={styles.button}>
                    Trigger Sound
                </button>
                <button onClick={handleStopAll} style={{...styles.button, ...styles.stopButton}}>
                    Stop All Sounds
                </button>
            </div>

            <div style={styles.preview}>
                <MusicBoxMin stop={stopSignal} refresh={refresh} data={activeData} />
                <div style={styles.note}>MusicBox is running. Check console for logs.</div>
            </div>
        </div>
    );
}

export default MusicBoxTest;