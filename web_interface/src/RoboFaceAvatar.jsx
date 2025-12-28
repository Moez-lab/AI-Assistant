import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Load the robo face model from public folder
const MODEL_URL = '/robo_face.glb';

export default function RoboFaceAvatar({ isSpeaking, setDebugInfo }) {
    const { scene } = useGLTF(MODEL_URL);
    const groupRef = useRef();
    const headMeshRef = useRef();
    const jawMeshRef = useRef();
    const eyeBlinkTimer = useRef(0);
    const [morphTargets, setMorphTargets] = useState({});
    const [hasMorphs, setHasMorphs] = useState(false);

    // Find meshes and morph targets
    useEffect(() => {
        let foundMesh = null;
        let foundMorphs = {};
        let foundJaw = null;

        console.log('🔍 Scanning robo face model...');

        scene.traverse((child) => {
            console.log(`Found: ${child.type} - ${child.name}`);

            // Look for jaw mesh (for fallback animation)
            if (child.isMesh && child.name.toLowerCase().includes('jaw')) {
                foundJaw = child;
                console.log('✓ Found jaw mesh:', child.name);
            }

            if (child.isMesh && child.morphTargetDictionary) {
                const keys = Object.keys(child.morphTargetDictionary);
                console.log(`✓ Found mesh with morphs: ${child.name}`, keys);

                if (keys.some(k => {
                    const lower = k.toLowerCase();
                    return lower.includes('mouth') ||
                        lower.includes('jaw') ||
                        lower.includes('viseme') ||
                        lower.includes('lip');
                })) {
                    foundMesh = child;
                    foundMorphs = child.morphTargetDictionary;
                    console.log('✓✓ Found mesh with MOUTH morphs:', child.name);
                } else if (!foundMesh && child.morphTargetDictionary) {
                    foundMesh = child;
                    foundMorphs = child.morphTargetDictionary;
                }
            }
        });

        if (foundMesh) {
            headMeshRef.current = foundMesh;
            setMorphTargets(foundMorphs);
            setHasMorphs(true);

            if (setDebugInfo) {
                const mouthMorphs = Object.keys(foundMorphs).filter(m => {
                    const lower = m.toLowerCase();
                    return lower.includes('mouth') || lower.includes('jaw') ||
                        lower.includes('viseme') || lower.includes('lip');
                });
                setDebugInfo(`✓ Morph Animation\nMesh: ${foundMesh.name}\nMouth Morphs: ${mouthMorphs.length > 0 ? mouthMorphs.join(', ') : 'None'}\nTotal: ${Object.keys(foundMorphs).length}`);
            }
        } else {
            console.warn('⚠ No morph targets found - using fallback animation');
            if (setDebugInfo) setDebugInfo("⚠ No morph targets\nUsing fallback: Mesh scale animation");
            setHasMorphs(false);
        }

        if (foundJaw) {
            jawMeshRef.current = foundJaw;
        }
    }, [scene, setDebugInfo]);

    // Animation loop
    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Eye blinking timer
        eyeBlinkTimer.current += 0.016;
        if (eyeBlinkTimer.current > 3 + Math.random() * 2) {
            eyeBlinkTimer.current = 0;
        }
        const blinkProgress = eyeBlinkTimer.current < 0.15 ? Math.sin(eyeBlinkTimer.current * Math.PI / 0.15) : 0;

        if (hasMorphs && headMeshRef.current && headMeshRef.current.morphTargetInfluences) {
            // MORPH TARGET ANIMATION (if available)
            const influences = headMeshRef.current.morphTargetInfluences;

            // Eye blinking
            Object.keys(morphTargets).forEach((key) => {
                const lower = key.toLowerCase();
                if (lower.includes('blink') || (lower.includes('eye') && lower.includes('close'))) {
                    const idx = morphTargets[key];
                    influences[idx] = blinkProgress * 0.8;
                }
            });

            // Lip sync
            if (isSpeaking) {
                const baseFreq = 8.0;
                const jawOpen = Math.abs(Math.sin(t * baseFreq)) * 0.7;
                const lipWide = Math.abs(Math.sin(t * baseFreq * 0.9)) * 0.5;
                const lipPucker = Math.abs(Math.sin(t * baseFreq * 0.6)) * 0.4;

                Object.keys(morphTargets).forEach((key) => {
                    const lower = key.toLowerCase();
                    const idx = morphTargets[key];

                    if (lower.includes('jaw') && lower.includes('open') ||
                        lower.includes('mouth') && lower.includes('open') ||
                        lower.includes('viseme_aa')) {
                        influences[idx] = THREE.MathUtils.lerp(influences[idx], jawOpen, 0.25);
                    }
                    else if (lower.includes('wide') || lower.includes('smile') ||
                        lower.includes('viseme_e') || lower.includes('viseme_i')) {
                        influences[idx] = THREE.MathUtils.lerp(influences[idx], lipWide, 0.25);
                    }
                    else if (lower.includes('pucker') || lower.includes('viseme_o') ||
                        lower.includes('viseme_u')) {
                        influences[idx] = THREE.MathUtils.lerp(influences[idx], lipPucker, 0.25);
                    }
                    else if ((lower.includes('mouth') || lower.includes('lip')) &&
                        !lower.includes('corner')) {
                        influences[idx] = THREE.MathUtils.lerp(influences[idx], jawOpen * 0.5, 0.2);
                    }
                });
            } else {
                // Return to neutral
                Object.keys(morphTargets).forEach((key) => {
                    const lower = key.toLowerCase();
                    if (lower.includes('mouth') || lower.includes('jaw') ||
                        lower.includes('viseme') || lower.includes('lip')) {
                        const idx = morphTargets[key];
                        influences[idx] = THREE.MathUtils.lerp(influences[idx], 0, 0.15);
                    }
                });
            }
        } else {
            // FALLBACK ANIMATION (no morph targets - use mesh transforms)
            if (groupRef.current) {
                if (isSpeaking) {
                    // Animate entire head with subtle movements
                    const baseFreq = 8.0;
                    const jawOpen = Math.abs(Math.sin(t * baseFreq)) * 0.02;
                    const headBob = Math.sin(t * baseFreq * 0.5) * 0.01;

                    // Subtle scale animation to simulate mouth opening
                    groupRef.current.scale.y = 1 + jawOpen;
                    groupRef.current.position.y = -1 + headBob;

                    // Subtle rotation for more life
                    groupRef.current.rotation.z = Math.sin(t * 2) * 0.02;
                } else {
                    // Return to neutral
                    groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, 1, 0.1);
                    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, -1, 0.1);
                    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.1);
                }
            }
        }
    });

    return (
        <group ref={groupRef}>
            <primitive
                object={scene}
                position={[0, 0, 0]}
                scale={[1.2, 1.2, 1.2]}
                rotation={[0, 0, 0]}
            />
        </group>
    );
}
