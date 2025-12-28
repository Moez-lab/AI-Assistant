import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, Scanline, ToneMapping } from '@react-three/postprocessing';
import Avatar from './Avatar';
import './App.css';

function TestLipSync() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [status, setStatus] = useState("Testing Mode");
    const [debugInfo, setDebugInfo] = useState("");
    const [autoTest, setAutoTest] = useState(false);

    // Auto-test cycle: speak for 5 seconds, idle for 3 seconds
    useEffect(() => {
        if (autoTest) {
            const interval = setInterval(() => {
                setIsSpeaking(prev => !prev);
            }, isSpeaking ? 5000 : 3000);

            return () => clearInterval(interval);
        }
    }, [autoTest, isSpeaking]);

    const toggleSpeaking = () => {
        setIsSpeaking(!isSpeaking);
    };

    const toggleAutoTest = () => {
        setAutoTest(!autoTest);
    };

    return (
        <div className="canvas-container">
            {/* Joi HUD Overlay */}
            <div className="hud-container">
                <div className="hud-overlay-grid"></div>

                {/* Top Left: Identity */}
                <div className="hud-logo">
                    <div className="three-bars">
                        <div className="bar"></div>
                        <div className="bar"></div>
                        <div className="bar"></div>
                    </div>
                    <div className="joi-text">JOI</div>
                    <div className="serial-text">SERIAL 27X-BA71759-0213 MODEL 3.0</div>
                </div>

                {/* Left Side: Stats */}
                <div className="hud-stats">
                    <div className="stat-row"><span className="arrow">▶</span> <span className="label">Body Type</span> <span className="value">SLENDER</span></div>
                    <div className="stat-row"><span className="arrow">▶</span> <span className="label">Face Type</span> <span className="value">CLASSIC</span></div>
                    <div className="stat-row"><span className="arrow">▶</span> <span className="label">Skin Tone</span> <span className="value">OLIVE</span></div>
                    <div className="stat-row"><span className="arrow">▶</span> <span className="label">Eye Color</span> <span className="value">BROWN</span></div>
                    <div className="stat-row"><span className="arrow">▶</span> <span className="label">Lip Color</span> <span className="value">NEUTRAL</span></div>
                    <div className="stat-row"><span className="arrow">▶</span> <span className="label">Language</span> <span className="value">ENGLISH</span></div>
                </div>

                {/* Right Side: Test Controls */}
                <div className="hud-connect-panel">
                    <div className="emanator-text">LIP SYNC TEST MODE</div>
                    <div className="connect-box">
                        <button
                            onClick={toggleSpeaking}
                            style={{
                                background: isSpeaking ? '#ff0066' : '#00ff88',
                                border: 'none',
                                padding: '10px 20px',
                                color: '#000',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                marginBottom: '10px',
                                width: '100%'
                            }}
                        >
                            {isSpeaking ? 'STOP SPEAKING' : 'START SPEAKING'}
                        </button>
                        <button
                            onClick={toggleAutoTest}
                            style={{
                                background: autoTest ? '#ff6600' : '#0066ff',
                                border: 'none',
                                padding: '10px 20px',
                                color: '#fff',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            {autoTest ? 'STOP AUTO TEST' : 'START AUTO TEST'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Debug/Status Footer */}
            <div className="status-overlay">
                Status: {status} | Action: {isSpeaking ? "Speaking 🗣️" : "Idle 😊"} | Auto: {autoTest ? "ON" : "OFF"}
                <div style={{ fontSize: '10px' }}>{debugInfo}</div>
            </div>

            <Canvas camera={{ position: [0, 0.2, 0.8], fov: 50 }}>
                <color attach="background" args={['#0a0a15']} />

                {/* Three-Point Lighting Setup for Face */}
                <ambientLight intensity={0.6} />

                {/* Key Light - Main light from front-right */}
                <spotLight
                    position={[2, 1.8, 2]}
                    intensity={3.5}
                    color="#ffd4e5"
                    angle={0.5}
                    penumbra={1}
                    castShadow
                />

                {/* Fill Light - Softer light from front-left */}
                <pointLight
                    position={[-1.5, 1.5, 1.5]}
                    intensity={2}
                    color="#e0b3ff"
                />

                {/* Rim Light - Cyan backlight for edge definition */}
                <pointLight
                    position={[0, 2, -1]}
                    intensity={2.5}
                    color="#00e5ff"
                />

                {/* Face Fill - Gentle uplight to soften shadows */}
                <pointLight
                    position={[0, 0.5, 1]}
                    intensity={1.2}
                    color="#fff5f5"
                />

                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

                <Avatar isSpeaking={isSpeaking} setDebugInfo={setDebugInfo} />

                {/* Limit Controls to Face Area */}
                <OrbitControls
                    target={[0, 0.2, 0]}
                    minDistance={0.5}
                    maxDistance={1.5}
                    enablePan={false}
                    maxPolarAngle={Math.PI / 1.5}
                    minPolarAngle={Math.PI / 3}
                />

                {/* Post Processing for Film Look */}
                <EffectComposer disableNormalPass>
                    <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                    <Noise opacity={0.05} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                    <Scanline density={1.25} opacity={0.1} />
                    <ToneMapping adaptive={true} resolution={256} middleGrey={0.6} maxLuminance={16.0} averageLuminance={1.0} adaptationRate={1.0} />
                </EffectComposer>
            </Canvas>
        </div>
    );
}

export default TestLipSync;
