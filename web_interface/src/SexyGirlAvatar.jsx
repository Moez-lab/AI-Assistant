import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';

const MODEL_URL = '/models/sexy_girl/scene.gltf';

export default function SexyGirlAvatar({ isSpeaking, setDebugInfo }) {
    const { scene } = useGLTF(MODEL_URL);
    const { scene: hoodieScene } = useGLTF('/models/hoodie/scene.gltf');
    const group = useRef();
    const headMeshRef = useRef();
    const leftUpperArmRef = useRef();
    const rightUpperArmRef = useRef();
    const leftForeArmRef = useRef();
    const rightForeArmRef = useRef();

    const {
        shoulderX, shoulderY, shoulderZ,
        elbowX, elbowY, elbowZ
    } = useControls('Body Pose', {
        shoulderX: { value: 0.8, min: -1.5, max: 1.5, step: 0.1, label: 'Shoulder Forward/Back' },
        shoulderY: { value: -0.2, min: -1.5, max: 1.5, step: 0.1, label: 'Shoulder Twist' },
        shoulderZ: { value: -1.0, min: -1.5, max: 1.5, step: 0.1, label: 'Shoulder Up/Down' },
        elbowX: { value: 0.4, min: -1.5, max: 2.5, step: 0.1, label: 'Elbow Bend' },
        elbowY: { value: 0, min: -1.5, max: 1.5, step: 0.1, label: 'Elbow Twist' },
        elbowZ: { value: -0.6, min: -1.5, max: 1.5, step: 0.1, label: 'Elbow Side' },
    });

    const { showDebugPanel } = useControls('Debug', {
        showDebugPanel: { value: false, label: 'Show Debug Panel' }
    });

    const { avatarPosition, avatarScale } = useControls('Avatar Transform', {
        avatarPosition: { value: [0, -5.7, 0], step: 0.1, label: 'Position' },
        avatarScale: { value: 2.3, min: 0.1, max: 5, step: 0.1, label: 'Scale' }
    });

    const { skinColor, envMapIntensity, skinRoughness, skinNormalScale } = useControls('Skin Settings', {
        skinColor: { value: '#ffcbb1', label: 'Skin Tint' }, // Natural peach/skin tone
        envMapIntensity: { value: 0.6, min: 0, max: 3, step: 0.1, label: 'Lighting Intensity' },
        skinRoughness: { value: 0.5, min: 0.0, max: 1.0, step: 0.05, label: 'Roughness' },
        skinNormalScale: { value: 1.5, min: 0.0, max: 3.0, step: 0.1, label: 'Texture Detail' },
    });

    const { hairColor1, hairColor2, hairGradientAngle, hairGradientPos, hairGradientSharpness } = useControls('Hair Gradient', {
        hairColor1: { value: '#39274c', label: 'Main Color' },
        hairColor2: { value: '#2d4949', label: 'Highlight Color' }, // Cyan/Teal as requested
        hairGradientAngle: { value: 196, min: 0, max: 360, step: 1, label: 'Angle' },
        hairGradientPos: { value: 2, min: -1, max: 2, step: 0.01, label: 'Position' },
        hairGradientSharpness: { value: 5, min: 0.01, max: 5.0, step: 0.01, label: 'Sharpness' }
    });

    const [morphTargets, setMorphTargets] = useState({});
    const [debugLogs, setDebugLogs] = useState([]);

    // Custom Shader Material for Hair
    // Using simple Object Space coordinates for a clean gradient cut
    const hairMaterial = React.useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                color1: { value: new THREE.Color(hairColor1) },
                color2: { value: new THREE.Color(hairColor2) },
                angle: { value: hairGradientAngle },
                splitPos: { value: hairGradientPos },
                sharpness: { value: hairGradientSharpness }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPos;
                void main() {
                    vUv = uv;
                    vPos = position; // Object space position
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float angle;
                uniform float splitPos;
                uniform float sharpness;
                varying vec2 vUv;
                varying vec3 vPos;

                void main() {
                    // Rotate position for gradient
                    float rad = radians(angle);
                    vec2 dir = vec2(cos(rad), sin(rad));
                    
                    // We use x and y of object position. 
                    float t = dot(vPos.xy, dir); 
                    
                    // Adjust range
                    float mixVal = smoothstep(splitPos - (0.5/sharpness), splitPos + (0.5/sharpness), t);
                    
                    vec3 finalColor = mix(color1, color2, mixVal);
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });
    }, []);

    // Update uniforms when controls change
    useEffect(() => {
        if (hairMaterial) {
            hairMaterial.uniforms.color1.value.set(hairColor1);
            hairMaterial.uniforms.color2.value.set(hairColor2);
            hairMaterial.uniforms.angle.value = hairGradientAngle;
            hairMaterial.uniforms.splitPos.value = hairGradientPos;
            hairMaterial.uniforms.sharpness.value = hairGradientSharpness;
        }
    }, [hairMaterial, hairColor1, hairColor2, hairGradientAngle, hairGradientPos, hairGradientSharpness]);


    // Fix texture encoding and find head mesh
    useEffect(() => {
        let foundHead = null;
        let morphsFound = [];

        console.log("🔍 SexyGirl Avatar: Analyzing Model...");

        // Texture Loader
        const textureLoader = new THREE.TextureLoader();
        const texturePath = '/models/sexy_girl/textures/';

        const textureMap = {
            'Std_Skin_Head': 'Std_Skin_Head_diffuse.jpeg',
            'Std_Skin_Body': 'Std_Skin_Body_diffuse.jpeg',
            'Std_Skin_Arm': 'Std_Skin_Arm_diffuse.jpeg',
            'Std_Skin_Leg': 'Std_Skin_Leg_diffuse.jpeg',
            'Std_Eye_L': 'Std_Eye_L_diffuse.jpeg',
            'Std_Eye_R': 'Std_Eye_R_diffuse.jpeg',
            'Std_Cornea_L': 'Std_Cornea_L_diffuse.jpeg',
            'Std_Cornea_R': 'Std_Cornea_R_diffuse.jpeg',
            'Std_Upper_Teeth': 'Std_Upper_Teeth_diffuse.jpeg',
            'Std_Lower_Teeth': 'Std_Lower_Teeth_diffuse.jpeg',
            'Std_Tongue': 'Std_Tongue_diffuse.jpeg',
            'Std_Nails': 'Std_Nails_diffuse.jpeg',
            'Std_Eyelash': 'Std_Eyelash_diffuse.png',
            'Std_Tearline_L': 'Std_Tearline_L_diffuse.png',
            'Std_Tearline_R': 'Std_Tearline_R_diffuse.png',
            'Std_Eye_Occlusion_L': 'Std_Eye_Occlusion_L_diffuse.png',
            'Std_Eye_Occlusion_R': 'Std_Eye_Occlusion_R_diffuse.png',
            'Underwear_Bottoms': 'shorts_texture.png',
            'material': null,
            'obj_default': 'hoodie_texture.png'
        };

        // DEBUG: Print Scene Hierarchy to find the Ghost Mesh
        scene.traverse((c) => {
            if (c.isMesh) console.log(`[MESH]: ${c.name} | Mat: ${c.material.name} | Visible: ${c.visible} | Parent: ${c.parent.name} | Skinned: ${c.isSkinnedMesh}`);
        });

        scene.traverse((child) => {
            if (child.isMesh) {
                const matName = (child.material && child.material.name) ? child.material.name.toLowerCase() : '';

                // GHOST ARM FIX
                if (matName.includes('std_skin_arm')) {
                    console.log(`👻 Hiding Arm Mesh (User Request): ${child.name}`);
                    child.visible = false;
                }

                // HAIR GRADIENT APPLICATION
                if (matName.includes('obj_default') || child.name === 'Object_34') {
                    console.log(`✨ Applying Gradient Shader to Hair: ${child.name}`);
                    child.material = hairMaterial;
                    child.visible = true;
                    // Ensure it doesn't get overwritten by texture loader below
                    return;
                }

                // Hide Lower Body (Legs, Underwear, Torso) AND Nails (Tips)
                if (matName.includes('std_skin_leg') || matName.includes('underwear_bottoms') || matName.includes('std_skin_body') || matName.includes('std_nails')) {
                    console.log(`👻 Hiding Body Part/Nails: ${child.name}`);
                    child.visible = false;
                }

                // Special handling for Eye parts (Cornea, Eyelashes, Occlusion)
                if (matName.includes('cornea') || matName.includes('occlusion') || matName.includes('eyelash') || matName.includes('tearline')) {
                    child.material.transparent = true;
                    // Cornea should be mostly transparent to show the eye behind it
                    if (matName.includes('cornea')) {
                        child.material.opacity = 0.1;
                        child.material.roughness = 0.0;
                        child.material.metalness = 1.0; // Glossy reflection
                    }
                }

                // Ensure textures use correct encoding and apply manual fix
                if (child.material) {
                    let hasManualReplacement = false;

                    // 1. Try to find a matching manual existing texture in our map
                    for (const [key, fileName] of Object.entries(textureMap)) {
                        // Check if material name contains the key (case insensitive)
                        if (matName.includes(key.toLowerCase())) {
                            hasManualReplacement = true;

                            if (fileName === null) {
                                console.log(`Hidden Mesh: ${child.name}`);
                                child.visible = false;
                                break; // Stop checking keys
                            }
                            console.log(`🔧 Applying Manual Texture for ${child.material.name}: ${fileName}`);
                            textureLoader.load(texturePath + fileName, (tex) => {
                                tex.encoding = THREE.sRGBEncoding;
                                tex.flipY = false;
                                child.material.map = tex;

                                // SKIN ENHANCEMENT FOR MANUAL TEXTURES
                                if (matName.includes('skin')) {
                                    child.material.color.set(skinColor);
                                    child.material.roughness = skinRoughness;
                                    child.material.metalness = 0.0;
                                    child.material.envMapIntensity = envMapIntensity;
                                }
                                // TEETH ENHANCEMENT
                                if (matName.includes('teeth')) {
                                    child.material.roughness = 0.2; // Glossy teeth
                                    child.material.metalness = 0.0;
                                    child.material.envMapIntensity = 1.5;
                                    child.material.color.set('#ffffff'); // Force white teeth base
                                }

                                child.material.needsUpdate = true;
                                console.log(`[TEX SUCCESS] ${fileName}`);
                                setDebugLogs(prev => [...prev, `[OK] ${fileName}`]);
                            }, undefined, (err) => {
                                console.error(`[TEX FAIL] ${fileName}`, err);
                                setDebugLogs(prev => [...prev, `[FAIL] ${fileName}`]);
                            });

                            // NEW: Check for manual normal map match
                            // For hoodie/shorts we used specific keys in textureMap that map to diffuse
                            // We can try to load a matching normal map if one exists
                            const normalName = fileName.replace('_texture.png', '_normal.png').replace('_diffuse', '_normal');
                            if (fileName.includes('texture.png') || matName.includes('skin')) {
                                // Special case for our generated ones OR skin
                                let nName = fileName.replace('texture.png', 'normal.png');
                                if (matName.includes('skin')) {
                                    nName = fileName.replace('_diffuse', '_normal').replace('.jpeg', '.png').replace('.jpg', '.png');
                                }

                                textureLoader.load(texturePath + nName, (norm) => {
                                    norm.flipY = false;
                                    child.material.normalMap = norm;
                                    child.material.normalScale.set(skinNormalScale, skinNormalScale); // Boost effect
                                    child.material.needsUpdate = true;
                                    console.log(`[TEX SUCCESS] Normal: ${nName}`);
                                    setDebugLogs(prev => [...prev, `[OK Norm] ${nName}`]);
                                }, undefined, (err) => {
                                    console.error(`[TEX FAIL] Normal: ${nName}`, err);
                                    setDebugLogs(prev => [...prev, `[FAIL Norm] ${nName}`]);
                                });
                            }
                            break; // Stop checking keys once match found
                        }
                    }

                    // 2. If no manual replacement was triggered, but an existing map exists, fix encoding & apply settings
                    if (!hasManualReplacement && child.material.map) {
                        child.material.map.encoding = THREE.sRGBEncoding;

                        // SKIN ENHANCEMENT LOGIC (Only if not manually replaced)
                        if (matName.includes('skin')) {
                            child.material.color.set(skinColor);
                            child.material.roughness = skinRoughness;
                            child.material.metalness = 0.0; // Skin is not metallic
                            child.material.envMapIntensity = envMapIntensity;

                            if (child.material.normalMap) {
                                child.material.normalScale.set(skinNormalScale, skinNormalScale);
                            }
                        }
                        // TEETH ENHANCEMENT
                        if (matName.includes('teeth')) {
                            child.material.roughness = 0.2;
                            child.material.envMapIntensity = 1.5;
                        }
                    }
                }

                // Check for emissive map
                if (child.material.emissiveMap) child.material.emissiveMap.encoding = THREE.sRGBEncoding;
                // Check for normal map and others if needed

                // Look for morph targets
                if (child.morphTargetDictionary) {
                    const count = Object.keys(child.morphTargetDictionary).length;
                    console.log(`Mesh '${child.name}' has ${count} morphs:`, Object.keys(child.morphTargetDictionary));
                    morphsFound.push(`${child.name} (${count})`);

                    // Identify the main head mesh for lip sync
                    // Heuristic: contains 'head' or has many morphs
                    if (child.name.toLowerCase().includes('head') || !foundHead || count > 20) {
                        foundHead = child;
                    }
                }
            }
        });

        if (foundHead) {
            headMeshRef.current = foundHead;
            setMorphTargets(foundHead.morphTargetDictionary);
            console.log("✓ Head Mesh Identified:", foundHead.name);
            if (setDebugInfo) setDebugInfo(`Loaded. Head: ${foundHead.name} (${Object.keys(foundHead.morphTargetDictionary).length} morphs)`);
        } else {
            console.warn("❌ No suitable head mesh found.");
            if (setDebugInfo) setDebugInfo("Loaded. NO HEAD MORPHS FOUND.");
        }

    }, [scene, setDebugInfo, skinRoughness, skinNormalScale, skinColor, envMapIntensity, hairMaterial]); // Added hairMaterial dependency

    // Find bones once scene is loaded
    useEffect(() => {
        const logs = [];
        const allBones = [];

        scene.traverse((c) => {
            if (c.isMesh) {
                logs.push(`[MESH] ${c.name} | Mat: ${c.material?.name || 'N/A'} | Skinned: ${c.isSkinnedMesh} | Vis: ${c.visible}`);
            }
        });

        // Hoodie Clean-up: Hide reference body meshes inside the hoodie GLB
        if (hoodieScene) {
            hoodieScene.traverse((c) => {
                if (c.isMesh) {
                    const mName = c.material?.name || '';
                    const oName = c.name || '';
                    // ALWAYS log to see what we are dealing with
                    console.log(`[HOODIE_DEBUG] Found Mesh: ${oName}, Mat: ${mName}`);

                    // Heuristic to hide the reference body
                    const isSkin = mName.toLowerCase().includes('skin') || oName.toLowerCase().includes('body') || oName.toLowerCase().includes('genesis') || oName.toLowerCase().includes('mannequin');

                    // We know the hoodie uses 'obj_default'. If it's NOT that, and looks like skin/body...
                    if (isSkin || (mName !== 'obj_default' && mName !== 'material')) {
                        // Note: 'material' was Object_32 (hidden). 'obj_default' is Hoodie.
                        // If there is a 'Skin' material, hide it.
                        if (isSkin) {
                            console.log(`Hidden Hoodie Ref: ${oName}`);
                            c.visible = false;
                        }
                    }
                }
            });
        }

        setDebugLogs(logs);

        scene.traverse((child) => {
            if (child.isBone) {
                const name = child.name.toLowerCase();

                // Debug log all bones to help verify
                if (name.includes('arm')) {
                    // console.log(`Potential Bone: ${child.name}`);
                }

                // Check Left/Right
                const isL = name.includes('base_l_') || name.includes('left') || name.includes(' l ');
                const isR = name.includes('base_r_') || name.includes('right') || name.includes(' r ');

                // STRICTER Bone Logic: Exclude 'twist' to avoid rotating the wrong bone
                const isTwist = name.includes('twist');

                // Upper Arm Search
                if (name.includes('upperarm') && !isTwist) {
                    if (isL) {
                        leftUpperArmRef.current = child;
                        console.log("✓ Found Left UpperArm (Main):", child.name);
                    }
                    if (isR) {
                        rightUpperArmRef.current = child;
                        console.log("✓ Found Right UpperArm (Main):", child.name);
                    }
                }

                // Forearm Search
                if (name.includes('forearm') && !isTwist) {
                    if (isL) {
                        leftForeArmRef.current = child;
                        console.log("✓ Found Left Forearm (Main):", child.name);
                    }
                    if (isR) {
                        rightForeArmRef.current = child;
                        console.log("✓ Found Right Forearm (Main):", child.name);
                    }
                }
            }
        });
        console.log("🦴 All Bones:", allBones);
        window.DEBUG_BONES = allBones;
        window.DEBUG_ARM_REFS = {
            lArm: leftUpperArmRef.current ? leftUpperArmRef.current.name : 'MISSING',
            rArm: rightUpperArmRef.current ? rightUpperArmRef.current.name : 'MISSING',
            lFore: leftForeArmRef.current ? leftForeArmRef.current.name : 'MISSING',
            rFore: rightForeArmRef.current ? rightForeArmRef.current.name : 'MISSING',
        };
    }, [scene, hoodieScene]);

    // Expose logs to window for easy checking
    window.DEBUG_SCENE_MESHES = debugLogs;

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Apply Upper Arm (Shoulder) Rotation
        if (leftUpperArmRef.current) {
            leftUpperArmRef.current.rotation.x = shoulderX;
            leftUpperArmRef.current.rotation.y = shoulderY;
            leftUpperArmRef.current.rotation.z = (Math.PI / 3) + shoulderZ;
        }
        if (rightUpperArmRef.current) {
            rightUpperArmRef.current.rotation.x = shoulderX;
            rightUpperArmRef.current.rotation.y = -shoulderY; // Mirrored
            rightUpperArmRef.current.rotation.z = -((Math.PI / 3) + shoulderZ);
        }

        // Apply Forearm (Elbow) Rotation
        if (leftForeArmRef.current) {
            leftForeArmRef.current.rotation.x = elbowX;
            leftForeArmRef.current.rotation.y = elbowY;
            leftForeArmRef.current.rotation.z = elbowZ;
        }
        if (rightForeArmRef.current) {
            rightForeArmRef.current.rotation.x = elbowX;
            rightForeArmRef.current.rotation.y = -elbowY; // Mirrored
            rightForeArmRef.current.rotation.z = -elbowZ;
        }

        if (headMeshRef.current && morphTargets) {
            const influences = headMeshRef.current.morphTargetInfluences;
            const dict = morphTargets;

            // --- Reset morphs slightly to avoid getting stuck ---
            // (Optional, depnds on implementation)

            // --- Blink Animation ---
            // Common names: blink, eyes_closed, blink_left, etc.
            const blinkLeft = dict['Blink_Left'] ?? dict['blink_left'] ?? dict['eyeBlinkLeft'] ?? dict['eyes_closed'];
            const blinkRight = dict['Blink_Right'] ?? dict['blink_right'] ?? dict['eyeBlinkRight'] ?? dict['eyes_closed'];

            // Random blinking logic
            if (Math.random() > 0.995) {
                if (blinkLeft !== undefined) influences[blinkLeft] = 1;
                if (blinkRight !== undefined) influences[blinkRight] = 1;
            } else {
                if (blinkLeft !== undefined) influences[blinkLeft] = THREE.MathUtils.lerp(influences[blinkLeft], 0, 0.1);
                if (blinkRight !== undefined) influences[blinkRight] = THREE.MathUtils.lerp(influences[blinkRight], 0, 0.1);
            }

            // --- Lip Sync ---
            if (isSpeaking) {
                // Common names for jaw opening
                const jawOpen = dict['jawOpen'] ?? dict['Mouth_Open'] ?? dict['mouthOpen'] ?? dict['A'] ?? dict['aa'];
                // 'A' or 'aa' are often used for general mouth opening in VRChat/MMD models

                // Simple sine wave for talking simulation
                const intensity = (Math.sin(t * 15) * 0.5 + 0.5) * 0.6; // 0 to 0.6 range

                if (jawOpen !== undefined) influences[jawOpen] = intensity;

            } else {
                // Close mouth gradually
                const jawOpen = dict['jawOpen'] ?? dict['Mouth_Open'] ?? dict['mouthOpen'] ?? dict['A'] ?? dict['aa'];
                if (jawOpen !== undefined) influences[jawOpen] = THREE.MathUtils.lerp(influences[jawOpen], 0, 0.15);
            }
        }
    });

    return (
        <group ref={group} dispose={null} position={avatarPosition} scale={[avatarScale, avatarScale, avatarScale]}>
            <primitive
                object={scene}
                // Local transforms relative to the group
                scale={[1, 1, 1]}
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
            />
            <HoodieModel scene={hoodieScene} />

            {/* DEBUG OVERLAY */}
            {/* DEBUG OVERLAY */}
            {showDebugPanel && (
                <Html position={[0, 0, 0]}>
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(0,0,0,0.8)',
                        color: '#0f0',
                        padding: '10px',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        fontSize: '10px',
                        fontFamily: 'monospace'
                    }}>
                        <h3>Debug Meshes</h3>
                        {debugLogs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                </Html>
            )}
        </group>
    );
}

function HoodieModel({ scene }) {
    // Leva controls for positioning
    const { position, rotation, scale } = useControls('Hoodie', {
        position: { value: [0, 0.28, 0], step: 0.05 },
        rotation: { value: [0, 0, 0], step: 0.1 },
        scale: { value: [1.5, 1.5, 1.5], step: 0.1 }
    });

    return <primitive object={scene} position={position} rotation={rotation} scale={scale} />;
}

useGLTF.preload(MODEL_URL);
useGLTF.preload('/models/hoodie/scene.gltf');