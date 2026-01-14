import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

// Make sure the user has placed the file here!
const MODEL_URL = '/models/stickman.glb';

export default function StickManAvatar({ isSpeaking, setDebugInfo }) {
    const group = useRef();
    const { scene, animations } = useGLTF(MODEL_URL);
    const { actions, names } = useAnimations(animations, group);
    const [morphTargets, setMorphTargets] = useState({});
    const headMeshRef = useRef();

    // 1. Setup Animations & Find Head Mesh
    useEffect(() => {
        let foundHead = null;
        console.log('Animation Names:', names); // Debugging

        // Find Head for Morph Targets
        scene.traverse((child) => {
            if (child.isMesh && child.morphTargetDictionary) {
                console.log('Found Mesh with Morphs:', child.name, Object.keys(child.morphTargetDictionary));
                // Usually the head has the most morphs
                if (!foundHead || Object.keys(child.morphTargetDictionary).length > Object.keys(foundHead.morphTargetDictionary).length) {
                    foundHead = child;
                }
            }
        });

        if (foundHead) {
            headMeshRef.current = foundHead;
            setMorphTargets(foundHead.morphTargetDictionary);
            if (setDebugInfo) setDebugInfo(`Loaded. Morphs: ${Object.keys(foundHead.morphTargetDictionary).length}`);
        } else {
            console.warn("No morph targets found on any mesh.");
            if (setDebugInfo) setDebugInfo(`Loaded. NO MORPHS.`);
        }

        // Play Idle by default
        const idleAction = actions['Idle stance'] || actions['Idle'] || actions[names[0]]; // Fallback
        if (idleAction) {
            idleAction.reset().fadeIn(0.5).play();
        }

        return () => {
            // Cleanup
            actions && Object.values(actions).forEach(action => action.stop());
        };
    }, [scene, actions, names, setDebugInfo]);

    // 2. Handle Speaking State (Body Animation)
    useEffect(() => {
        // "Talking loop" is the name from Sketchfab description
        const talkAction = actions['Talking loop'] || actions['Talking'];
        const idleAction = actions['Idle stance'] || actions['Idle'];

        if (isSpeaking) {
            if (talkAction) {
                if (idleAction) idleAction.fadeOut(0.5);
                talkAction.reset().fadeIn(0.5).play();
            }
        } else {
            if (talkAction) talkAction.fadeOut(0.5);
            if (idleAction) {
                idleAction.reset().fadeIn(0.5).play();
            }
        }
    }, [isSpeaking, actions]);


    // 3. Lip Sync (Morph Targets)
    useFrame((state) => {
        const t = state.clock.elapsedTime;

        if (headMeshRef.current && isSpeaking) {
            const influences = headMeshRef.current.morphTargetInfluences;
            const dict = morphTargets;

            // Simple sine wave based random lip movement
            // Ideally we map real visemes here if we had them
            const mouthOpen = Math.abs(Math.sin(t * 10)) * 0.5 + 0.1;

            // Try common names
            const openName = Object.keys(dict).find(k => k.toLowerCase().includes('open') || k.toLowerCase().includes('mouth'));

            if (openName) {
                influences[dict[openName]] = mouthOpen;
            } else {
                // Fallback: Just shake the head scale or something if no morphs? 
                // Actually, the "Talking loop" animation likely has mouth movement baked in if it's an FBX converted to GLB properly.
                // If so, we might not need manual morphing. 
                // But if we want *audio driven* sync, we overwrite it here.
            }
        } else if (headMeshRef.current && !isSpeaking) {
            // Close mouth
            const influences = headMeshRef.current.morphTargetInfluences;
            const dict = morphTargets;
            Object.keys(dict).forEach(key => {
                influences[dict[key]] = THREE.MathUtils.lerp(influences[dict[key]], 0, 0.1);
            });
        }
    });

    return (
        <group ref={group} dispose={null}>
            <primitive object={scene} scale={[1, 1, 1]} position={[0, -1, 0]} />
        </group>
    );
}
useGLTF.preload(MODEL_URL);
