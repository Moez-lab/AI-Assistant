import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, Scanline, ToneMapping } from '@react-three/postprocessing';
import RoboFaceAvatar from './RoboFaceAvatar';
import './App.css';

function App() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("Connecting...");
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('ws://localhost:8765');
      ws.onopen = () => { setStatus("Connected"); console.log("Connected"); };
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'speak_start') setIsSpeaking(true);
          else if (message.type === 'speak_stop') setIsSpeaking(false);
        } catch (e) { console.error(e); }
      };
      ws.onclose = () => { setStatus("Disconnected"); setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
      return ws;
    };
    const ws = connect();
    return () => ws.close();
  }, []);

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
          {/* <div className="stat-row"><span className="arrow">▶</span> <span className="label">Height</span> <span className="value">168 CM</span></div> */}
          <div className="stat-row"><span className="arrow">▶</span> <span className="label">Body Type</span> <span className="value">SLENDER</span></div>
          <div className="stat-row"><span className="arrow">▶</span> <span className="label">Face Type</span> <span className="value">CLASSIC</span></div>
          <div className="stat-row"><span className="arrow">▶</span> <span className="label">Skin Tone</span> <span className="value">OLIVE</span></div>
          <div className="stat-row"><span className="arrow">▶</span> <span className="label">Eye Color</span> <span className="value">BROWN</span></div>
          <div className="stat-row"><span className="arrow">▶</span> <span className="label">Lip Color</span> <span className="value">NEUTRAL</span></div>
          <div className="stat-row"><span className="arrow">▶</span> <span className="label">Language</span> <span className="value">ENGLISH</span></div>
        </div>

        {/* Right Side: Connect */}
        <div className="hud-connect-panel">
          <div className="emanator-text">EMANATOR DETECTED</div>
          <div className="connect-box">
            <span className="infinity-icon">∞</span>
            <span className="connect-btn">CONNECT</span>
          </div>
        </div>
      </div>

      {/* Debug/Status Footer */}
      <div className="status-overlay">
        Status: {status} | Action: {isSpeaking ? "Speaking" : "Idle"}
        <div style={{ fontSize: '10px' }}>{debugInfo}</div>
      </div>

      <Canvas camera={{ position: [0, 0.2, 4], fov: 50 }}>
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

        <RoboFaceAvatar isSpeaking={isSpeaking} setDebugInfo={setDebugInfo} />

        {/* Limit Controls to Face Area */}
        <OrbitControls
          target={[0, 0, 0]}
          minDistance={2}
          maxDistance={6}
          enablePan={true}
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

export default App;
