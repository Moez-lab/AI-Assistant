import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Using a publicly accessible sci-fi character model
// This is a fallback - if it doesn't work, we'll use the BladeRunnerAvatar
const MODEL_URL = "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/voxel-girl-1/model.gltf";

export default function SketchfabAvatar({ isSpeaking, setDebugInfo }) {
    const { scene } = useGLTF(MODEL_URL);
    const headMeshRef = useRef();
    const eyeBlinkTimer = useRef(0);
    const [morphTargets, setMorphTargets] = useState({});

    // Find the head mesh with morph targets
    useEffect(() => {
        let foundMesh = null;
        let foundMorphs = {};

        scene.traverse((child) => {
            if (child.isMesh && child.morphTargetDictionary) {
                const keys = Object.keys(child.morphTargetDictionary);

                // Look for mesh with viseme morphs or any morphs
                if (keys.some(k => k.toLowerCase().includes('mouth') || k.toLowerCase().includes('viseme'))) {
                    foundMesh = child;
                    foundMorphs = child.morphTargetDictionary;
                } else if (!foundMesh && child.morphTargetDictionary) {
                    foundMesh = child;
                    foundMorphs = child.morphTargetDictionary;
                }
            }
        });

        if (foundMesh) {
            headMeshRef.current = foundMesh;
            setMorphTargets(foundMorphs);

            if (setDebugInfo) {
                const mouthMorphs = Object.keys(foundMorphs).filter(m =>
                    m.toLowerCase().includes('mouth') || m.toLowerCase().includes('viseme')
                ).length;
                setDebugInfo(`Mesh: ${foundMesh.name}\\nMouth Morphs: ${mouthMorphs}\\nTotal Morphs: ${Object.keys(foundMorphs).length}`);
            }
        } else {
            if (setDebugInfo) setDebugInfo("No mesh with morph targets found - using basic animation");
        }
    }, [scene, setDebugInfo]);

    // Lip sync animation
    useFrame((state) => {
        if (!headMeshRef.current || !headMeshRef.current.morphTargetInfluences) return;

        const t = state.clock.elapsedTime;
        const influences = headMeshRef.current.morphTargetInfluences;

        // Eye blinking
        eyeBlinkTimer.current += 0.016;
        if (eyeBlinkTimer.current > 3 + Math.random() * 2) {
            eyeBlinkTimer.current = 0;
        }

        const blinkProgress = eyeBlinkTimer.current < 0.15 ? Math.sin(eyeBlinkTimer.current * Math.PI / 0.15) : 0;

        // Try to find and animate eye blink morphs
        Object.keys(morphTargets).forEach((key) => {
            if (key.toLowerCase().includes('blink') || key.toLowerCase().includes('eye')) {
                const idx = morphTargets[key];
                influences[idx] = blinkProgress * 0.8;
            }
        });

        // Lip sync based on speaking state
        if (isSpeaking) {
            const baseFreq = 8.0;
            const jawOpen = Math.abs(Math.sin(t * baseFreq)) * 0.6;
            const lipWide = Math.abs(Math.sin(t * baseFreq * 0.9)) * 0.5;

            // Try to animate any mouth-related morphs
            Object.keys(morphTargets).forEach((key) => {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('mouth') || lowerKey.includes('jaw') || lowerKey.includes('viseme')) {
                    const idx = morphTargets[key];
                    if (lowerKey.includes('open') || lowerKey.includes('aa')) {
                        influences[idx] = jawOpen;
                    } else if (lowerKey.includes('wide') || lowerKey.includes('smile')) {
                        influences[idx] = lipWide;
                    } else {
                        influences[idx] = Math.abs(Math.sin(t * baseFreq * 0.7)) * 0.4;
                    }
                }
            });
        } else {
            // Return to neutral
            Object.keys(morphTargets).forEach((key) => {
                if (key.toLowerCase().includes('mouth') || key.toLowerCase().includes('jaw') || key.toLowerCase().includes('viseme')) {
                    const idx = morphTargets[key];
                    influences[idx] = THREE.MathUtils.lerp(influences[idx], 0, 0.15);
                }
            });
        }
    });

    return (
        <primitive
            object={scene}
            position={[0, -1.5, 0]}
            scale={[2, 2, 2]}
            rotation={[0, 0, 0]}
        />
    );
}
