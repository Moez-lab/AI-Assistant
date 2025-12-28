import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function TestThreeBasic() {
    return (
        <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                <color attach="background" args={['#0a0a15']} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />

                {/* Simple rotating cube to test Three.js */}
                <mesh>
                    <boxGeometry args={[2, 2, 2]} />
                    <meshStandardMaterial color="hotpink" />
                </mesh>

                <OrbitControls />
            </Canvas>

            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                color: 'white',
                fontSize: '24px',
                background: 'rgba(0,0,0,0.7)',
                padding: '20px',
                borderRadius: '10px'
            }}>
                ✅ Three.js Canvas Test
                <div style={{ fontSize: '14px', marginTop: '10px' }}>
                    If you see a pink cube, Three.js is working!
                </div>
            </div>
        </div>
    );
}

export default TestThreeBasic;
