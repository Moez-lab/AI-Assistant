import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

export default function BladeRunnerAvatar({ isSpeaking }) {
    const upperLipRef = useRef();
    const lowerLipRef = useRef();
    const jawRef = useRef();
    const leftEyeRef = useRef();
    const rightEyeRef = useRef();
    const blinkTimer = useRef(0);
    const hologramRef = useRef();

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Holographic flicker effect
        if (hologramRef.current) {
            hologramRef.current.material.opacity = 0.85 + Math.sin(t * 20) * 0.05 + Math.random() * 0.05;
        }

        // Eye blinking
        blinkTimer.current += 0.016;
        if (blinkTimer.current > 3 + Math.random() * 2) {
            blinkTimer.current = 0;
        }
        const blinkProgress = blinkTimer.current < 0.15 ? Math.sin(blinkTimer.current * Math.PI / 0.15) : 0;

        if (leftEyeRef.current) {
            leftEyeRef.current.scale.y = 1 - blinkProgress * 0.8;
        }
        if (rightEyeRef.current) {
            rightEyeRef.current.scale.y = 1 - blinkProgress * 0.8;
        }

        // Lip sync animation
        if (isSpeaking) {
            const baseFreq = 8.0;
            const jawOpen = Math.abs(Math.sin(t * baseFreq)) * 0.15;
            const mouthWide = Math.abs(Math.sin(t * baseFreq * 0.7)) * 0.1;
            const lipPucker = Math.abs(Math.sin(t * baseFreq * 0.5)) * 0.05;

            if (jawRef.current) {
                jawRef.current.position.y = -0.35 - jawOpen;
            }

            if (upperLipRef.current) {
                upperLipRef.current.scale.x = 1 + mouthWide - lipPucker;
                upperLipRef.current.position.y = -0.18 + jawOpen * 0.3;
            }

            if (lowerLipRef.current) {
                lowerLipRef.current.scale.x = 1 + mouthWide - lipPucker;
                lowerLipRef.current.position.y = -0.28 - jawOpen;
            }
        } else {
            if (jawRef.current) {
                jawRef.current.position.y = THREE.MathUtils.lerp(jawRef.current.position.y, -0.35, 0.1);
            }
            if (upperLipRef.current) {
                upperLipRef.current.scale.x = THREE.MathUtils.lerp(upperLipRef.current.scale.x, 1, 0.1);
                upperLipRef.current.position.y = THREE.MathUtils.lerp(upperLipRef.current.position.y, -0.18, 0.1);
            }
            if (lowerLipRef.current) {
                lowerLipRef.current.scale.x = THREE.MathUtils.lerp(lowerLipRef.current.scale.x, 1, 0.1);
                lowerLipRef.current.position.y = THREE.MathUtils.lerp(lowerLipRef.current.position.y, -0.28, 0.1);
            }
        }
    });

    return (
        <group position={[0, 0, 0]} scale={1.2}>
            {/* Holographic glow effect */}
            <Sphere ref={hologramRef} args={[0.65, 32, 32]} position={[0, 0, 0]}>
                <meshStandardMaterial
                    color="#00d4ff"
                    transparent
                    opacity={0.1}
                    emissive="#00d4ff"
                    emissiveIntensity={0.3}
                />
            </Sphere>

            {/* Head - realistic skin tone */}
            <Sphere args={[0.5, 64, 64]} position={[0, 0, 0]}>
                <meshStandardMaterial
                    color="#ffd4c4"
                    roughness={0.6}
                    metalness={0.1}
                />
            </Sphere>

            {/* Cheekbones */}
            <Sphere args={[0.12, 32, 32]} position={[-0.22, 0.05, 0.35]}>
                <meshStandardMaterial color="#ffccbb" roughness={0.5} />
            </Sphere>
            <Sphere args={[0.12, 32, 32]} position={[0.22, 0.05, 0.35]}>
                <meshStandardMaterial color="#ffccbb" roughness={0.5} />
            </Sphere>

            {/* Eyes - larger, more expressive */}
            <group>
                {/* Left Eye White */}
                <Sphere args={[0.1, 32, 32]} position={[-0.18, 0.12, 0.42]}>
                    <meshStandardMaterial color="#ffffff" />
                </Sphere>
                {/* Left Iris */}
                <Sphere args={[0.06, 32, 32]} position={[-0.18, 0.12, 0.5]}>
                    <meshStandardMaterial color="#4a90e2" emissive="#4a90e2" emissiveIntensity={0.3} />
                </Sphere>
                {/* Left Pupil */}
                <Sphere ref={leftEyeRef} args={[0.03, 16, 16]} position={[-0.18, 0.12, 0.52]}>
                    <meshStandardMaterial color="#000000" />
                </Sphere>

                {/* Right Eye White */}
                <Sphere args={[0.1, 32, 32]} position={[0.18, 0.12, 0.42]}>
                    <meshStandardMaterial color="#ffffff" />
                </Sphere>
                {/* Right Iris */}
                <Sphere args={[0.06, 32, 32]} position={[0.18, 0.12, 0.5]}>
                    <meshStandardMaterial color="#4a90e2" emissive="#4a90e2" emissiveIntensity={0.3} />
                </Sphere>
                {/* Right Pupil */}
                <Sphere ref={rightEyeRef} args={[0.03, 16, 16]} position={[0.18, 0.12, 0.52]}>
                    <meshStandardMaterial color="#000000" />
                </Sphere>
            </group>

            {/* Eyebrows */}
            <mesh position={[-0.18, 0.25, 0.45]} rotation={[0, 0, -0.1]}>
                <boxGeometry args={[0.15, 0.02, 0.02]} />
                <meshStandardMaterial color="#4a3728" />
            </mesh>
            <mesh position={[0.18, 0.25, 0.45]} rotation={[0, 0, 0.1]}>
                <boxGeometry args={[0.15, 0.02, 0.02]} />
                <meshStandardMaterial color="#4a3728" />
            </mesh>

            {/* Nose - more defined */}
            <mesh position={[0, 0.02, 0.48]}>
                <boxGeometry args={[0.08, 0.15, 0.08]} />
                <meshStandardMaterial color="#ffccbb" roughness={0.6} />
            </mesh>
            <Sphere args={[0.04, 16, 16]} position={[0, -0.05, 0.52]}>
                <meshStandardMaterial color="#ffccbb" />
            </Sphere>

            {/* Upper Lip - fuller, more defined */}
            <mesh ref={upperLipRef} position={[0, -0.18, 0.48]}>
                <boxGeometry args={[0.28, 0.05, 0.1]} />
                <meshStandardMaterial
                    color="#ff8899"
                    roughness={0.3}
                    metalness={0.1}
                />
            </mesh>

            {/* Lower Lip - fuller */}
            <mesh ref={lowerLipRef} position={[0, -0.28, 0.48]}>
                <boxGeometry args={[0.28, 0.06, 0.1]} />
                <meshStandardMaterial
                    color="#ff7788"
                    roughness={0.3}
                    metalness={0.1}
                />
            </mesh>

            {/* Jaw - more defined */}
            <group ref={jawRef} position={[0, -0.35, 0]}>
                <Sphere args={[0.35, 32, 32]} position={[0, 0, 0.25]}>
                    <meshStandardMaterial color="#ffd4c4" roughness={0.6} />
                </Sphere>
            </group>

            {/* Hair - long, flowing */}
            <group>
                {/* Main hair volume */}
                <Sphere args={[0.54, 32, 32]} position={[0, 0.25, -0.15]}>
                    <meshStandardMaterial
                        color="#2a1810"
                        roughness={0.8}
                    />
                </Sphere>
                {/* Hair sides */}
                <Sphere args={[0.25, 32, 32]} position={[-0.35, 0.1, 0]}>
                    <meshStandardMaterial color="#2a1810" roughness={0.8} />
                </Sphere>
                <Sphere args={[0.25, 32, 32]} position={[0.35, 0.1, 0]}>
                    <meshStandardMaterial color="#2a1810" roughness={0.8} />
                </Sphere>
                {/* Long hair back */}
                <Cylinder args={[0.15, 0.2, 0.8, 16]} position={[0, -0.4, -0.3]}>
                    <meshStandardMaterial color="#2a1810" roughness={0.8} />
                </Cylinder>
            </group>

            {/* Holographic scan lines */}
            {[...Array(5)].map((_, i) => (
                <mesh key={i} position={[0, -0.4 + i * 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.6, 0.61, 64]} />
                    <meshBasicMaterial
                        color="#00d4ff"
                        transparent
                        opacity={0.2}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
        </group>
    );
}
