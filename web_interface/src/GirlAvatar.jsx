import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Load the 3D girl model from public folder
const MODEL_URL = '/models/3d-girl/scene.gltf';

export default function GirlAvatar({ isSpeaking, setDebugInfo }) {
    const { scene } = useGLTF(MODEL_URL);

    // Load Textures Manually
    const [
        headDiff, headNorm,
        bodyDiff, bodyNorm,
        armDiff, armNorm,
        legDiff, legNorm,
        eyeDiff // Eyes often share or have specific maps
    ] = useLoader(THREE.TextureLoader, [
        '/models/3d-girl/textures/Std_Skin_Head_diffuse.jpeg',
        '/models/3d-girl/textures/Std_Skin_Head_normal.png',
        '/models/3d-girl/textures/Std_Skin_Body_diffuse.jpeg',
        '/models/3d-girl/textures/Std_Skin_Body_normal.png',
        '/models/3d-girl/textures/Std_Skin_Arm_diffuse.jpeg',
        '/models/3d-girl/textures/Std_Skin_Arm_normal.png',
        '/models/3d-girl/textures/Std_Skin_Leg_diffuse.jpeg',
        '/models/3d-girl/textures/Std_Skin_Leg_normal.png',
        '/models/3d-girl/textures/Std_Eye_R_diffuse.jpeg'
    ]);

    // Fix texture encoding/orientation for GLTF usage
    [headDiff, headNorm, bodyDiff, bodyNorm, armDiff, armNorm, legDiff, legNorm, eyeDiff].forEach(tex => {
        if (tex) {
            tex.flipY = false; // GLTF standard
            tex.colorSpace = THREE.SRGBColorSpace; // Correct color profile
        }
    });


    const groupRef = useRef();
    const headMeshRef = useRef();
    const jawBoneRef = useRef();
    const eyeBlinkTimer = useRef(0);
    const [morphTargets, setMorphTargets] = useState({});
    const [hasMorphs, setHasMorphs] = useState(false);

    // Find meshes, morph targets, and bones
    useEffect(() => {
        let foundJaw = null;
        let foundHead = null;
        let meshNamesFound = [];

        console.log('🔍 Configuring 3D girl model with PROVEN Mapping...');

        // CORRECT Mesh Mapping based on GLTF Deep Analysis
        // Mat 0 (Tongue) -> Mesh 0 -> Object_7
        // Mat 1 (Head)   -> Mesh 1 -> Object_9
        // Mat 2 (Body)   -> Mesh 2 -> Object_10
        // Mat 3 (Arm)    -> Mesh 3 -> Object_11
        // Mat 4 (Leg)    -> Mesh 4 -> Object_12
        const meshMap = {
            'Object_9': { type: 'head', diff: headDiff, norm: headNorm },
            'Object_10': { type: 'body', diff: bodyDiff, norm: bodyNorm },
            'Object_11': { type: 'arm', diff: armDiff, norm: armNorm },
            'Object_12': { type: 'leg', diff: legDiff, norm: legNorm },
            'Object_7': { type: 'tongue', color: new THREE.Color(0.8, 0.4, 0.4) },

            // Accessories
            'Object_34': { type: 'hair', color: new THREE.Color(0.2, 0.1, 0.1) },
            'Object_30': { type: 'clothes', color: new THREE.Color(0.1, 0.1, 0.1) },
            'Object_32': { type: 'shoes', color: new THREE.Color(0.8, 0.8, 0.8) }
        };

        scene.traverse((child) => {
            if (child.isMesh) {
                meshNamesFound.push(child.name);
                let config = meshMap[child.name];
                const lowerName = child.name.toLowerCase();
                const lowerMat = child.material?.name?.toLowerCase() || "";

                // If explicit config exists, apply it
                if (config) {
                    const materialProps = {
                        map: config.diff,
                        normalMap: config.norm,
                        color: config.color || new THREE.Color(1, 1, 1),
                        roughness: config.type === 'clothes' ? 0.7 : 0.4,
                        metalness: 0.0,
                        skinning: true
                    };
                    child.material = new THREE.MeshStandardMaterial(materialProps);

                    if (config.type === 'head') {
                        console.log(`✓ Head Mesh Configured: ${child.name}`);
                        foundHead = child;
                        headMeshRef.current = child;
                        setMorphTargets(child.morphTargetDictionary || {});
                        setHasMorphs(child.morphTargetDictionary && Object.keys(child.morphTargetDictionary).length > 0);
                    }
                }

                // 2. Fallbacks for Eyes/Nails if not in map (Generic matches)
                else if (lowerMat.includes('cornea') || lowerMat.includes('eye')) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: eyeDiff,
                        roughness: 0.1,
                        metalness: 0.0,
                        transparent: true,
                        opacity: 0.9,
                        skinning: true
                    });
                }
                else if (lowerMat.includes('eyelash')) {
                    child.material = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.9, skinning: true });
                }
                else if (lowerMat.includes('nails')) {
                    child.material = new THREE.MeshStandardMaterial({ color: 0xffaaaa, roughness: 0.3, skinning: true });
                }

                // Extra safety: If head wasn't found by explicit map, try name match
                // (Only if we haven't found it yet)
                if (!foundHead && (lowerName.includes('head') || lowerName.includes('face') || (child.morphTargetDictionary && Object.keys(child.morphTargetDictionary).length > 0))) {
                    // Only set if we really suspect this is it
                    if (child.morphTargetDictionary) {
                        foundHead = child;
                        headMeshRef.current = child;
                        setMorphTargets(child.morphTargetDictionary);
                        setHasMorphs(true);
                    }
                }
            }

            // Check for bones
            if (child.isBone) {
                const lowerName = child.name.toLowerCase();
                // Prioritize Lower Jaw or Chin, avoiding Upper Jaw
                if ((lowerName.includes('jaw') || lowerName.includes('chin')) && !lowerName.includes('upper')) {
                    foundJaw = child;
                }
            }
        });

        // Fallback for jaw if morphs fail (but we forced head mesh so this is secondary)
        if (foundJaw) {
            jawBoneRef.current = foundJaw;
        }

        // Detailed Debug Info
        if (setDebugInfo) {
            let info = `Status: ${isSpeaking ? "SPEAKING" : "Idle"}\n`;
            info += `Mesh Count: ${meshNamesFound.length}\n`;
            if (foundHead) {
                const morphKeys = foundHead.morphTargetDictionary ? Object.keys(foundHead.morphTargetDictionary) : [];
                info += `✓ Head: ${foundHead.name}\n`;
                info += `Morphs (${morphKeys.length}): ${morphKeys.slice(0, 8).join(', ')}${morphKeys.length > 8 ? '...' : ''}\n`;
            } else {
                info += `❌ Head NOT found! Meshes:\n${meshNamesFound.slice(0, 5).join(', ')}...\n`;
            }
            if (foundJaw) info += `✓ Jaw Bone: ${foundJaw.name}`;
            else info += `❌ Jaw Bone NOT found`;

            setDebugInfo(info);
        }

    }, [scene, setDebugInfo, isSpeaking, headDiff, headNorm, bodyDiff, bodyNorm, armDiff, armNorm, legDiff, legNorm, eyeDiff]);

    // Animation loop
    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Eye blinking timer
        eyeBlinkTimer.current += 0.016;
        if (eyeBlinkTimer.current > 3 + Math.random() * 2) {
            eyeBlinkTimer.current = 0;
        }
        const blinkProgress = eyeBlinkTimer.current < 0.15 ? Math.sin(eyeBlinkTimer.current * Math.PI / 0.15) : 0;

        // 1. Morph Target Animation
        let lipMorphApplied = false;

        if (hasMorphs && headMeshRef.current && headMeshRef.current.morphTargetInfluences) {
            const influences = headMeshRef.current.morphTargetInfluences;

            // Eye blinking
            if (morphTargets) {
                Object.keys(morphTargets).forEach((key) => {
                    const lower = key.toLowerCase();
                    if (lower.includes('blink') || (lower.includes('eye') && lower.includes('close'))) {
                        const idx = morphTargets[key];
                        influences[idx] = blinkProgress * 0.8;
                    }
                });
            }

            // Lip sync
            if (isSpeaking) {
                const baseFreq = 8.0;
                // Generate pseudo-random values for different mouth shapes
                const jawOpen = Math.abs(Math.sin(t * baseFreq)) * 0.7; // A / Ah
                const lipWide = Math.abs(Math.sin(t * baseFreq * 0.9 + 1)) * 0.5; // E / I
                const lipPucker = Math.abs(Math.sin(t * baseFreq * 0.6 + 2)) * 0.6; // O / U

                Object.keys(morphTargets).forEach((key) => {
                    const lower = key.toLowerCase();
                    const idx = morphTargets[key];

                    // Map common ARKit/Standard morph names
                    if (lower.includes('jawopen') || lower.includes('mouthopen') || lower.includes('viseme_aa') || lower.includes('a_aa') || lower === 'aa' || lower.includes('mouth_a')) {
                        influences[idx] = THREE.MathUtils.lerp(influences[idx], jawOpen, 0.25);
                        lipMorphApplied = true;
                    }
                    else if (lower.includes('mouthsmile') || lower.includes('viseme_e') || lower.includes('viseme_i') || lower === 'ih' || lower === 'e' || lower.includes('mouth_i')) {
                        influences[idx] = THREE.MathUtils.lerp(influences[idx], lipWide, 0.25);
                        lipMorphApplied = true;
                    }
                    else if (lower.includes('mouthpucker') || lower.includes('mouthfunnel') || lower.includes('viseme_o') || lower.includes('viseme_u') || lower === 'oh' || lower === 'ou' || lower.includes('mouth_o')) {
                        influences[idx] = THREE.MathUtils.lerp(influences[idx], lipPucker, 0.25);
                        lipMorphApplied = true;
                    }
                });
            } else {
                // Reset
                Object.keys(morphTargets).forEach((key) => {
                    // ... reset logic
                    const lower = key.toLowerCase();
                    if (lower.includes('mouth') || lower.includes('jaw')) {
                        const idx = morphTargets[key];
                        influences[idx] = THREE.MathUtils.lerp(influences[idx], 0, 0.15);
                    }
                });
            }
        }

        // 2. Fallback to Numbered Morphs (Shotgun Approach)
        // If we found morphs but couldn't verify them by name, they are likely named "0", "1", "2"... 
        // We will try to animate the first few indices which typically contain open/close shapes.
        if (!lipMorphApplied && hasMorphs && headMeshRef.current) {
            const influences = headMeshRef.current.morphTargetInfluences;
            if (isSpeaking) {
                const baseFreq = 8.0;
                // Try animating indices 0, 1, 2, 3... up to 15.
                // We use different phases so they don't all move at once.

                // Standard CC characters often have jaw/mouth morphs in the first ~20.
                // We will gently oscillate them.

                // Morph 0
                influences[0] = Math.abs(Math.sin(t * baseFreq)) * 0.5;
                // Morph 1 (often Smile or Widen)
                influences[1] = Math.abs(Math.sin(t * baseFreq * 0.8)) * 0.3;

                // Random-ish chatter for others
                // We'll pick a "dominant" random one every second to vary it? 
                // No, simple oscillation is safer for now.
                influences[2] = Math.max(0, Math.sin(t * 10) * 0.3);
            } else {
                // Reset first few
                influences[0] = THREE.MathUtils.lerp(influences[0], 0, 0.1);
                influences[1] = THREE.MathUtils.lerp(influences[1], 0, 0.1);
                influences[2] = THREE.MathUtils.lerp(influences[2], 0, 0.1);
            }
        }

        // 3. Bone Animation (Last Resort / Neck Fix)
        if (!lipMorphApplied && jawBoneRef.current) {
            // User reported X axis was wrong. It might be local rotation issue.
            // Let's try Z axis instead if X looked "wrong" (sideways).
            // Or try NEGATIVE X.
            if (isSpeaking) {
                const baseFreq = 8.0;
                const jawRotation = Math.abs(Math.sin(t * baseFreq)) * 0.15;

                // Trying Z axis this time based on user feedback of X being wrong
                // jawBoneRef.current.rotation.z = THREE.MathUtils.lerp(jawBoneRef.current.rotation.z, jawRotation, 0.2);

                // actually, let's Disable bone entirely if we are doing the morph trick above.
                // It looks cleaner to just rely on Morphs if the bone is weird.
            }
        }
        // 3. Whole Mesh Scale Animation (Last Resort)
        else {
            if (groupRef.current) {
                if (isSpeaking) {
                    const baseFreq = 8.0;
                    const jawOpen = Math.abs(Math.sin(t * baseFreq)) * 0.02;
                    groupRef.current.scale.y = 1.2 + jawOpen; // Base scale is 1.2
                } else {
                    groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, 1.2, 0.1);
                }
            }
        }
    });

    return (
        <group ref={groupRef}>
            <primitive
                object={scene}
                position={[0, -1.7, 0]} // Adjusted position to center face
                scale={[1, 1, 1]}
                rotation={[0, 0, 0]}
            />
        </group>
    );
}
