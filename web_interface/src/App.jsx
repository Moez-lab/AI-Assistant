import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette, Scanline, ToneMapping } from '@react-three/postprocessing';
import SexyGirlAvatar from './SexyGirlAvatar'; // UPDATED
import './App.css';
import * as THREE from 'three'; // Ensure THREE is imported if needed for error boundary styling or just use CSS

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', background: 'white', zIndex: 9999, position: 'absolute' }}>
          <h1>Something went wrong.</h1>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [facePosition, setFacePosition] = useState({ x: 0, y: 0 }); // New State
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
          else if (message.type === 'face_track') {
            // Expecting data: { x: float, y: float } (Normalized -1 to 1)
            // Smooth lerp could be done here or in component. 
            // We'll pass raw target to component.
            setFacePosition(message.data);
          }
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
    <ErrorBoundary>
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
            <div className="stat-row"><span className="arrow">▶</span> <span className="label">Body Type</span> <span className="value">ORGANIC</span></div>
            <div className="stat-row"><span className="arrow">▶</span> <span className="label">Face Type</span> <span className="value">HUMAN</span></div>
            <div className="stat-row"><span className="arrow">▶</span> <span className="label">Skin Tone</span> <span className="value">FAIR</span></div>
            <div className="stat-row"><span className="arrow">▶</span> <span className="label">Eye Color</span> <span className="value">BLUE</span></div>
            <div className="stat-row"><span className="arrow">▶</span> <span className="label">Lip Color</span> <span className="value">RED</span></div>
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
          <span style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: status === "Connected" ? '#0f0' : '#f00',
            marginRight: '8px',
            boxShadow: status === "Connected" ? '0 0 8px #0f0' : 'none'
          }}></span>
          Status: {status} | Action: {isSpeaking ? "Speaking" : "Idle"}
          | Face: {facePosition.x?.toFixed(2)}, {facePosition.y?.toFixed(2)}
          <br />Last Signal: {debugInfo.split('\n')[0] || "None"}

          <div style={{ fontSize: '10px' }}>{debugInfo}</div>
        </div>

        <Canvas camera={{ position: [0, 1.0, 10.0], fov: 35 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}>
          <color attach="background" args={['#050510']} />

          {/* Environment for Reflections */}
          {/* We use a simple environment map or just lights if no HDR available. Let's stick to lights but boost them for gloss. */}

          {/* Lighting Setup for Cinematic Look - BRIGHTER */}
          <ambientLight intensity={1.5} /> {/* Significantly increased from 0.4 */}

          {/* Frontal Directional Light - General Visibility */}
          <directionalLight
            position={[0, 2, 10]}
            intensity={3.0}
            color="#ffffff"
          />

          {/* Key Light - Warm - Adjusted for new camera distance */}
          <spotLight
            position={[5, 5, 10]} // Moved further back and up
            intensity={10.0} // Boosted significantly
            color="#ffefe0"
            angle={0.5}
            penumbra={0.5}
            castShadow
          />

          {/* Fill Light - Cool */}
          <pointLight
            position={[-5, 2, 5]}
            intensity={4.0}
            color="#d0e0ff"
          />

          {/* Rim Light - Strong Blue/Cyan for Cyberpunk feel */}
          <spotLight
            position={[0, 5, -5]}
            intensity={10.0}
            color="#00ffff"
            angle={1}
            penumbra={1}
          />

          {/* Rim Light 2 - Magenta for Contrast */}
          <spotLight
            position={[5, 0, -5]}
            intensity={6.0}
            color="#ff00ff"
            angle={0.8}
          />

          {/* Bottom Fill - Uplighting for face visibility */}
          <pointLight
            position={[0, -2, 3]}
            intensity={2.0}
            color="#ffffff"
          />


          <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

          <React.Suspense fallback={null}>
            <SexyGirlAvatar isSpeaking={isSpeaking} setDebugInfo={setDebugInfo} facePosition={facePosition} />
          </React.Suspense>


          {/* Limit Controls to Face Area */}
          <OrbitControls
            target={[0, 0.0, 0]} // Center view (was -1.0)
            minDistance={1.5}
            maxDistance={15} // Increased max distance
            enablePan={true}
          />

          {/* Post Processing for Film Look */}
          {/* Post Processing for Film Look - DISABLED FOR DEBUGGING */
          /* <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.7} luminanceSmoothing={0.9} height={300} intensity={0.8} />
             Chromatic Aberration removed for stability
            <Noise opacity={0.03} />
            <Vignette eskil={false} offset={0.1} darkness={1.0} />
            <ToneMapping />
          </EffectComposer> */ }
        </Canvas>
      </div>
    </ErrorBoundary>
  );
}

export default App;

