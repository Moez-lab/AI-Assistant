import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

export default function SimpleAvatar({ isSpeaking }) {
    const upperLipRef = useRef();
    const lowerLipRef = useRef();
    const jawRef = useRef();
    const leftEyeRef = useRef();
    const rightEyeRef = useRef();
    const blinkTimer = useRef(0);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

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

            // Animate jaw (lower part of face)
            if (jawRef.current) {
                jawRef.current.position.y = -0.25 - jawOpen;
            }

            // Animate upper lip
            if (upperLipRef.current) {
                upperLipRef.current.scale.x = 1 + mouthWide - lipPucker;
                upperLipRef.current.position.y = -0.12 + jawOpen * 0.3;
            }

            // Animate lower lip
            if (lowerLipRef.current) {
                lowerLipRef.current.scale.x = 1 + mouthWide - lipPucker;
                lowerLipRef.current.position.y = -0.2 - jawOpen;
            }
        } else {
            // Return to neutral
            if (jawRef.current) {
                jawRef.current.position.y = THREE.MathUtils.lerp(jawRef.current.position.y, -0.25, 0.1);
            }
            if (upperLipRef.current) {
                upperLipRef.current.scale.x = THREE.MathUtils.lerp(upperLipRef.current.scale.x, 1, 0.1);
                upperLipRef.current.position.y = THREE.MathUtils.lerp(upperLipRef.current.position.y, -0.12, 0.1);
            }
            if (lowerLipRef.current) {
                lowerLipRef.current.scale.x = THREE.MathUtils.lerp(lowerLipRef.current.scale.x, 1, 0.1);
                lowerLipRef.current.position.y = THREE.MathUtils.lerp(lowerLipRef.current.position.y, -0.2, 0.1);
            }
        }
    });

    return (
        <group position={[0, 0, 0]} scale={1.5}>
            {/* Head */}
            <Sphere args={[0.5, 32, 32]} position={[0, 0, 0]}>
                <meshStandardMaterial color="#ffdbac" />
            </Sphere>

            {/* Left Eye */}
            <Sphere ref={leftEyeRef} args={[0.08, 16, 16]} position={[-0.15, 0.1, 0.4]}>
                <meshStandardMaterial color="#000000" />
            </Sphere>

            {/* Right Eye */}
            <Sphere ref={rightEyeRef} args={[0.08, 16, 16]} position={[0.15, 0.1, 0.4]}>
                <meshStandardMaterial color="#000000" />
            </Sphere>

            {/* Nose */}
            <Sphere args={[0.05, 16, 16]} position={[0, 0, 0.45]}>
                <meshStandardMaterial color="#ffccaa" />
            </Sphere>

            {/* Upper Lip */}
            <mesh ref={upperLipRef} position={[0, -0.12, 0.45]}>
                <boxGeometry args={[0.25, 0.04, 0.08]} />
                <meshStandardMaterial color="#ff6b9d" />
            </mesh>

            {/* Lower Lip */}
            <mesh ref={lowerLipRef} position={[0, -0.2, 0.45]}>
                <boxGeometry args={[0.25, 0.04, 0.08]} />
                <meshStandardMaterial color="#ff5588" />
            </mesh>

            {/* Jaw (lower part of face) */}
            <group ref={jawRef} position={[0, -0.25, 0]}>
                <Sphere args={[0.3, 32, 32]} position={[0, 0, 0.2]}>
                    <meshStandardMaterial color="#ffdbac" />
                </Sphere>
            </group>

            {/* Hair */}
            <Sphere args={[0.52, 32, 32]} position={[0, 0.2, -0.1]}>
                <meshStandardMaterial color="#4a3728" />
            </Sphere>
        </group>
    );
}
