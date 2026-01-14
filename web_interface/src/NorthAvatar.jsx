import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/north/scene.gltf';

export default function NorthAvatar({ isSpeaking, setDebugInfo }) {
    const { scene } = useGLTF(MODEL_URL);
    const group = useRef();
    const headMeshRef = useRef();
    const [morphTargets, setMorphTargets] = useState({});

    useEffect(() => {
        let foundHead = null;
        let morphsFound = [];

        console.log("🔍 North Avatar: Analyzing Model...");

        scene.traverse((child) => {
            if (child.isMesh) {
                // Fix potential texture encoding issues
                if (child.material && child.material.map) {
                    child.material.map.encoding = THREE.sRGBEncoding;
                }

                // Look for morph targets
                if (child.morphTargetDictionary) {
                    const count = Object.keys(child.morphTargetDictionary).length;
                    console.log(`Mesh '${child.name}' has ${count} morphs:`, Object.keys(child.morphTargetDictionary));
                    morphsFound.push(`${child.name} (${count})`);

                    // The head usually has the most morphs, or is named 'Head'
                    if (child.name.toLowerCase().includes('head') || !foundHead || count > 30) {
                        foundHead = child;
                    }
                }
            }
        });

        if (foundHead) {
            headMeshRef.current = foundHead;
            setMorphTargets(foundHead.morphTargetDictionary);
            console.log("✓ Head Mesh Identified:", foundHead.name);
            if (setDebugInfo) setDebugInfo(`North Loaded. Head: ${foundHead.name} (${Object.keys(foundHead.morphTargetDictionary).length} morphs)`);
        } else {
            console.warn("❌ No suitable head mesh found.");
            if (setDebugInfo) setDebugInfo("North Loaded. NO HEAD MORPHS FOUND.");
        }

    }, [scene, setDebugInfo]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        if (headMeshRef.current && morphTargets) {
            const influences = headMeshRef.current.morphTargetInfluences;
            const dict = morphTargets;

            // Blink Animation
            const blinkLeft = dict['Blink_Left'] ?? dict['blink_left'] ?? dict['eyeBlinkLeft'];
            const blinkRight = dict['Blink_Right'] ?? dict['blink_right'] ?? dict['eyeBlinkRight'];

            // Random blinking
            if (Math.random() > 0.995) {
                if (blinkLeft !== undefined) influences[blinkLeft] = 1;
                if (blinkRight !== undefined) influences[blinkRight] = 1;
            } else {
                if (blinkLeft !== undefined) influences[blinkLeft] = THREE.MathUtils.lerp(influences[blinkLeft], 0, 0.1);
                if (blinkRight !== undefined) influences[blinkRight] = THREE.MathUtils.lerp(influences[blinkRight], 0, 0.1);
            }

            // Lip Sync
            if (isSpeaking) {
                // Try to find visemes
                // Common ARKit/Apple names: jawOpen, mouthSmile, etc.
                const jawOpen = dict['jawOpen'] ?? dict['Mouth_Open'] ?? dict['mouthOpen'];
                const smile = dict['mouthSmile_L'] ?? dict['Mouth_Smile'] ?? dict['smile'];

                // Audio-driven sine wave simulation
                const intensity = (Math.sin(t * 15) * 0.5 + 0.5) * 0.6; // 0 to 0.6 range

                // Apply to available morphs
                if (jawOpen !== undefined) influences[jawOpen] = intensity;

                // Slight smile when speaking
                if (smile !== undefined) influences[smile] = 0.2;

            } else {
                // Close mouth
                const jawOpen = dict['jawOpen'] ?? dict['Mouth_Open'] ?? dict['mouthOpen'];
                if (jawOpen !== undefined) influences[jawOpen] = THREE.MathUtils.lerp(influences[jawOpen], 0, 0.15);
            }
        }
    });

    return (
        <group ref={group} dispose={null}>
            <primitive
                object={scene}
                scale={[1.6, 1.6, 1.6]}
                position={[0, -4.8, 0]}
                rotation={[0, 0, 0]}
            />
        </group>
    );
}

useGLTF.preload(MODEL_URL);
