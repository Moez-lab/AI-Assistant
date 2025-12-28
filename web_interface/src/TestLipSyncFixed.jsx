import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import SimpleAvatar from './SimpleAvatar';
import BladeRunnerAvatar from './BladeRunnerAvatar';
import SketchfabAvatar from './SketchfabAvatar';
import RoboFaceAvatar from './RoboFaceAvatar';
import ErrorBoundary from './ErrorBoundary';
import './App.css';

function LoadingFallback() {
    return (
        <mesh>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial color="#00ff88" wireframe />
        </mesh>
    );
}

function TestLipSyncFixed() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [status, setStatus] = useState("Testing Mode");
    const [debugInfo, setDebugInfo] = useState("");
    const [autoTest, setAutoTest] = useState(false);
    const [error, setError] = useState(null);

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
                    <div className="joi-text">Jarvis</div>
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
                                width: '100%',
                                pointerEvents: 'auto'
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
                                width: '100%',
                                pointerEvents: 'auto'
                            }}
                        >
                            {autoTest ? 'STOP AUTO TEST' : 'START AUTO TEST'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Debug/Status Footer */}
            <div className="status-overlay" style={{ pointerEvents: 'none' }}>
                Status: {status} | Action: {isSpeaking ? "Speaking 🗣️" : "Idle 😊"} | Auto: {autoTest ? "ON" : "OFF"}
                <div style={{ fontSize: '10px' }}>{debugInfo}</div>
                {error && <div style={{ color: 'red', fontSize: '12px' }}>Error: {error}</div>}
            </div>

            <ErrorBoundary>
                <Canvas
                    camera={{ position: [0, 0.2, 4], fov: 50 }}
                    onCreated={() => {
                        console.log('Canvas created successfully');
                        setStatus("Canvas Ready");
                    }}
                    onError={(error) => {
                        console.error('Canvas error:', error);
                        setError(error.message);
                    }}
                >
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

                    <React.Suspense fallback={<LoadingFallback />}>
                        <RoboFaceAvatar isSpeaking={isSpeaking} setDebugInfo={setDebugInfo} />
                    </React.Suspense>

                    {/* Limit Controls to Face Area */}
                    <OrbitControls
                        target={[0, 0, 0]}
                        minDistance={1.5}
                        maxDistance={5}
                        enablePan={true}
                    />
                </Canvas>
            </ErrorBoundary>
        </div>
    );
}

export default TestLipSyncFixed;
