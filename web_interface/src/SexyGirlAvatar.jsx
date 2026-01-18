import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';

const MODEL_URL = '/models/sexy_girl/scene.gltf';

export default function SexyGirlAvatar({ isSpeaking, setDebugInfo, facePosition = { x: 0, y: 0 } }) {

    const { scene } = useGLTF(MODEL_URL);
    const { scene: hoodieScene } = useGLTF('/models/hoodie/scene.gltf');
    const group = useRef();
    const headMeshRef = useRef();
    const morphableMeshesRef = useRef([]); // Store all meshes with morphs
    const leftUpperArmRef = useRef();
    const rightUpperArmRef = useRef();
    const leftForeArmRef = useRef();
    const rightForeArmRef = useRef();
    const jawRef = useRef();
    const leftEyeBoneRef = useRef();
    const rightEyeBoneRef = useRef();
    const headBoneRef = useRef();
    const eyeBaseRotation = useRef({ left: new THREE.Euler(), right: new THREE.Euler() });
    const jawBaseQuaternion = useRef(new THREE.Quaternion()); // Store initial jaw rotation as quaternion
    const jawTargetQuaternion = useRef(new THREE.Quaternion()); // Target rotation for smooth interpolation


    // Blink State
    const blinkTimer = useRef(0);
    const nextBlinkInterval = useRef(3); // Start with 3 seconds

    // Clear list on mount/unmount to avoid dupes
    useEffect(() => {
        morphableMeshesRef.current = [];
    });

    // Body Pose Constants (Controls hidden)
    const shoulderX = 0.8;
    const shoulderY = -0.2;
    const shoulderZ = -1.0;
    const elbowX = 0.4;
    const elbowY = 0;
    const elbowZ = -0.6;

    // Jaw Calibration
    const { debugJaw, jawAxis, jawValue } = useControls('Jaw Calibration', {
        debugJaw: { value: false, label: 'Enable Manual Jaw' },
        jawAxis: { options: ['x', 'y', 'z'], value: 'x', label: 'Rotation Axis' },
        jawValue: { value: 0, min: -1, max: 1.65, step: 0.01, label: 'Rotation Value' }
    });



    const { showDebugPanel } = useControls('Debug', {
        showDebugPanel: { value: true, label: 'Enable Debug' }
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
        hairColor1: { value: '#dd0a0a', label: 'Main Color' },
        hairColor2: { value: '#0f0f0f', label: 'Highlight Color' },
        hairGradientAngle: { value: 196, min: 0, max: 360, step: 1, label: 'Angle' },
        hairGradientPos: { value: 0.88, min: -1, max: 2, step: 0.01, label: 'Position' },
        hairGradientSharpness: { value: 0.07, min: 0.01, max: 5.0, step: 0.01, label: 'Sharpness' }
    });

    const { debugMorphIndex, debugMorphValue, resetMorphs, testSpeak } = useControls('Morph Debugger', {
        debugMorphIndex: { value: 0, min: 0, max: 160, step: 1, label: 'Morph Index' },
        debugMorphValue: { value: 1, min: 0, max: 1, step: 0.1, label: 'Test Value' },
        resetMorphs: { value: false, label: 'Reset All (Click Toggle)' },
        testSpeak: { value: false, label: 'Test Speak (Override)' }
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
                sharpness: { value: hairGradientSharpness },
                lightDirection: { value: new THREE.Vector3(0.5, 1.0, 0.5) } // Standard lighting
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPos;
                varying vec3 vNormal;
                void main() {
                    vUv = uv;
                    vPos = position; // Object space position
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float angle;
                uniform float splitPos;
                uniform float sharpness;
                uniform vec3 lightDirection;
                
                varying vec2 vUv;
                varying vec3 vPos;
                varying vec3 vNormal;

                void main() {
                    // Rotate position for gradient
                    float rad = radians(angle);
                    vec2 dir = vec2(cos(rad), sin(rad));
                    
                    // We use x and y of object position. 
                    float t = dot(vPos.xy, dir); 
                    
                    // Adjust range
                    float mixVal = smoothstep(splitPos - (0.5/sharpness), splitPos + (0.5/sharpness), t);
                    
                    vec3 baseColor = mix(color1, color2, mixVal);

                    // Simple lighting
                    vec3 norm = normalize(vNormal);
                    vec3 viewDir = normalize(-vPos); // Approximate view direction
                    vec3 lightDir = normalize(lightDirection);

                    // Diffuse
                    float diffuse = max(dot(norm, lightDir), 0.0);
                    
                    // Specular (Glossy)
                    vec3 reflectDir = reflect(-lightDir, norm);
                    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

                    // Combine
                    vec3 ambient = vec3(0.3);
                    vec3 finalColor = baseColor * (ambient + vec3(diffuse)*0.8) + vec3(spec)*0.3;

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

                // GHOST ARM/BODY FIX (Aggressive)
                // Hide known body segments (based on GLTF analysis)
                // Removed Object_14 (Eyelashes) from list
                const hiddenNames = []; // ['Object_11']; 
                // if (matName.includes('std_skin_arm') || child.name.toLowerCase().includes('arm') || hiddenNames.includes(child.name)) {
                //      console.log(`👻 Hiding Body/Arm Mesh: ${child.name}`);
                //      child.visible = false;
                // }

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

                    // SHOTGUN DEBUG (REMOVED)
                    // morphableMeshesRef.current.push(child);

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
            console.log("MORPH DICTIONARY:", foundHead.morphTargetDictionary); // DEBUG 
            console.log("USER DATA:", foundHead.userData); // DEBUG

            // DUMP SKELETON
            if (foundHead.skeleton) {
                console.log("🦴 SKELETON FOUND:", foundHead.skeleton);
                const boneNames = foundHead.skeleton.bones.map((b, i) => `${i}:${b.name}`).join(', ');
                console.log("BONES:", boneNames);
                // Add to debug panel (chunked)
                const boneChunks = foundHead.skeleton.bones.map(b => b.name);
                // Show first 20 bones and any with 'jaw' or 'head'
                const interestingBones = boneChunks.filter((n, i) => i < 10 || n.toLowerCase().includes('jaw') || n.toLowerCase().includes('head') || n.toLowerCase().includes('chin'));
                setDebugLogs(prev => [...prev, ...interestingBones.map(b => `[SKEL] ${b}`)]);
            }

            if (setDebugInfo) setDebugInfo(`Loaded. Head: ${foundHead.name} (${Object.keys(foundHead.morphTargetDictionary).length} morphs)`);
        } else {
            console.warn("❌ No suitable head mesh found.");
            if (setDebugInfo) setDebugInfo("Loaded. NO HEAD MORPHS FOUND.");
        }

    }, [scene, setDebugInfo, skinRoughness, skinNormalScale, skinColor, envMapIntensity, hairMaterial]); // Added hairMaterial dependency

    // Find bones and Clean up Hoodie
    useEffect(() => {
        const logs = [];

        // Hoodie Clean-up: Hide reference body meshes inside the hoodie GLB
        if (hoodieScene) {
            // ... (existing hoodie logic)
        }

        // FIND HAIR MESHES (for alignment fix)
        const hairMeshes = [];
        scene.traverse((c) => {
            if (c.isMesh) {
                const mName = c.material?.name || '';
                // Common hair material names or object names
                if (mName.toLowerCase().includes('hair') || c.name.toLowerCase().includes('hair') || c.name === 'Object_34') {
                    hairMeshes.push(c);
                    // Ensure hair is visible
                    c.visible = true;
                    c.frustumCulled = false; // Prevent flickering



                    // Make hair material brighter and more receptive to light
                    if (c.material) {
                        // Removed hardcoded shader override to allow Leva controls to work
                        // The 'hairMaterial' applied in the first pass is now sufficient
                    }
                }
            }
        });
        window.HAIR_MESHES = hairMeshes; // Expose for debug
        console.log('=== HAIR DEBUG: Total hair meshes found:', hairMeshes.length);


        // BONE MAPPING (Skeleton based - Robust)
        if (headMeshRef.current && headMeshRef.current.skeleton) {
            const bones = headMeshRef.current.skeleton.bones;
            console.log("💀 Mapping Bones from Skeleton...", bones.length);

            // Find Head Bone first for Hair Attachment
            const headBone = bones.find(b => b.name.toLowerCase().includes('head'));
            if (headBone) {
                headBoneRef.current = headBone;
                logs.push(`[REF] Head -> ${headBone.name}`);

                // ATTACH STATIC HAIR TO HEAD BONE
                // ATTACH STATIC HAIR TO HEAD BONE
                window.HAIR_MESHES.forEach(hairMesh => {
                    // Force attach logic restored
                    // We attach BOTH Mesh and SkinnedMesh because the skincare weights are broken for stationary hair
                    try {
                        headBone.attach(hairMesh);
                        console.log(`Attached ${hairMesh.name} to HeadBone`);
                        logs.push(`[FIX] Attached ${hairMesh.name} -> Head`);
                    } catch (e) {
                        console.warn("Attachment failed:", e);
                    }
                });
            }

            // FORCE HIDE BODY PARTS - OPT-IN STRATEGY (The "Nuclear" Option)
            // Hide EVERYTHING by default, only reveal specifically allowed parts.
            if (headMeshRef.current) {
                scene.traverse((child) => {
                    if (child.isMesh) {
                        const name = child.name.toLowerCase();
                        const matName = child.material?.name?.toLowerCase() || '';

                        // ALLOWLIST: Only these parts are allowed to be visible
                        const isHair = name.includes('hair') || matName.includes('hair') || name.includes('scalp') || name === 'object_34';
                        const isHoodie = name.includes('hoodie') || matName.includes('cloth');

                        // Fix: Check MATERIAL names too, because mesh names can be generic (e.g. Object_20)
                        const isHead =
                            name.includes('head') || matName.includes('head') ||
                            name.includes('face') || matName.includes('face') ||
                            name.includes('teeth') || matName.includes('teeth') ||
                            name.includes('tongue') || matName.includes('tongue') ||
                            name.includes('eye') || matName.includes('eye') ||
                            name.includes('lash') || matName.includes('lash') ||
                            name.includes('brow') || matName.includes('brow') ||
                            name.includes('mouth') || matName.includes('mouth') ||
                            // Explicit Eye Parts (often named specifically)
                            name.includes('cornea') || matName.includes('cornea') ||
                            name.includes('pupil') || matName.includes('pupil') ||
                            name.includes('iris') || matName.includes('iris') ||
                            name.includes('sclera') || matName.includes('sclera') ||
                            name.includes('lens') || matName.includes('lens');


                        const isDebug = name.includes('debug'); // Keep debug plane if needed?

                        if (isHair || isHoodie || isHead) {
                            // Allowed to exist
                            return;
                        }

                        // BLOCKLIST: Hide everything else (Arms, Legs, Body, Accessories, etc.)
                        // console.log(`[HIDE] Auto-Hidden: ${child.name} (Mat: ${matName})`);
                        child.visible = false;
                        child.scale.set(0, 0, 0);
                        logs.push(`[HIDE] ${child.name}`);
                    }
                });
            }



            bones.forEach(bone => {
                const name = bone.name.toLowerCase();

                // Jaw (Lip Sync)
                if (name.includes('jawroot') || (name.includes('jaw') && !name.includes('upper'))) {
                    jawRef.current = bone;
                    jawBaseQuaternion.current.copy(bone.quaternion); // Store initial rotation as quaternion
                    logs.push(`[REF] Jaw -> ${bone.name}`);
                }
                // ... (rest of mapping)
                // Eyes
                if (name.includes('l_eye') || (name.includes('left') && name.includes('eye'))) {
                    leftEyeBoneRef.current = bone;
                    eyeBaseRotation.current.left.copy(bone.rotation);
                }
                if (name.includes('r_eye') || (name.includes('right') && name.includes('eye'))) {
                    rightEyeBoneRef.current = bone;
                    eyeBaseRotation.current.right.copy(bone.rotation);
                }

                // Arms
                if (name.includes('l_upperarm') && !name.includes('twist')) {
                    leftUpperArmRef.current = bone;
                }
                if (name.includes('r_upperarm') && !name.includes('twist')) {
                    rightUpperArmRef.current = bone;
                }
                if (name.includes('l_forearm') && !name.includes('twist')) {
                    leftForeArmRef.current = bone;
                }
                if (name.includes('r_forearm') && !name.includes('twist')) {
                    rightForeArmRef.current = bone;
                }
            });

        } else {
            console.warn("⚠️ Head/Skeleton not ready for bone mapping yet.");
        }

        setDebugLogs(prev => [...prev, ...logs]);

        // Debug Global
        window.DEBUG_ARM_REFS = {
            lArm: leftUpperArmRef.current ? leftUpperArmRef.current.name : 'MISSING',
            rArm: rightUpperArmRef.current ? rightUpperArmRef.current.name : 'MISSING',
            jaw: jawRef.current ? jawRef.current.name : 'MISSING'
        };

    }, [scene, hoodieScene, morphTargets]);

    // Expose logs to window for easy checking
    window.DEBUG_SCENE_MESHES = debugLogs;

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        let blinkIntensity = 0; // Moved here for scope visibility

        // DEBUG: Check Bone Refs once
        if (Math.random() < 0.01) {
            // console.log("LeftArmRef:", leftUpperArmRef.current?.name); 
        }

        // --- BONE BASED ANIMATION MOVED TO BOTTOM ---
        if (leftEyeBoneRef.current && rightEyeBoneRef.current) {
            blinkTimer.current += 0.016;
            const blinkDuration = 0.15; // Fast blink

            let scaleY = 1.0;

            if (blinkTimer.current >= nextBlinkInterval.current) {
                const timeSinceTrigger = blinkTimer.current - nextBlinkInterval.current;
                if (timeSinceTrigger < blinkDuration) {
                    // Scaling down to 0.1 simulates closed eye
                    const phase = timeSinceTrigger / blinkDuration;
                    const intensity = Math.sin(phase * Math.PI); // 0 -> 1 -> 0
                    scaleY = 1.0 - (intensity * 0.9); // Drop to 0.1
                } else {
                    // Reset
                    blinkTimer.current = 0;
                    nextBlinkInterval.current = 2 + Math.random() * 4;
                }
            }

            leftEyeBoneRef.current.scale.y = scaleY;
            rightEyeBoneRef.current.scale.y = scaleY;
        }

        if (headMeshRef.current && morphTargets) {
            // Keep headMeshRef logic if needed for other things, but clear morph debugger
            const influences = headMeshRef.current.morphTargetInfluences;
            if (headMeshRef.current.morphTargetDictionary) {
                console.log("MORPH NAMES LIST:", Object.keys(headMeshRef.current.morphTargetDictionary).join(", "));
                // FORCE DEBUG: See the structure
                console.log("MORPH DICT JSON:", JSON.stringify(headMeshRef.current.morphTargetDictionary).substring(0, 500)); // First 500 chars
                console.log("HAS mouthOpen?", headMeshRef.current.morphTargetDictionary.hasOwnProperty('mouthOpen'));
            }
            const dict = headMeshRef.current.morphTargetDictionary; // Defined here to avoid ReferenceError
            // ... (rest of logic removed)



            // --- Reset morphs slightly to avoid getting stuck ---
            // (Optional, depnds on implementation)

            // --- Blink Animation ---
            // Common names: blink, eyes_closed, blink_left, etc.
            // Search case-insensitive if exact match fails
            const findMorphIndex = (keys) => {
                for (let key of keys) {
                    if (dict[key] !== undefined) return dict[key];
                    // Try lower case
                    const lowerKey = Object.keys(dict).find(k => k.toLowerCase() === key.toLowerCase());
                    if (lowerKey) return dict[lowerKey];
                }
                return undefined;
            };

            const blinkLeftIndex = findMorphIndex(['Blink_Left', 'blink_left', 'eyeBlinkLeft', 'eyes_closed', 'close_eyes']);
            const blinkRightIndex = findMorphIndex(['Blink_Right', 'blink_right', 'eyeBlinkRight', 'eyes_closed', 'close_eyes']);


            // Timer Logic
            blinkTimer.current += 0.016; // Approx delta time (could use state.clock.getDelta() but be careful with re-renders)



            // Timer Logic
            // blinkTimer incremented above already
            const blinkDuration = 1; // Slower blink (0.5s)

            if (blinkTimer.current >= nextBlinkInterval.current) {
                // Time to blink!
                // We are in the blink phase.
                const timeSinceTrigger = blinkTimer.current - nextBlinkInterval.current;

                if (timeSinceTrigger < blinkDuration) {
                    // Calculate sine wave for smooth open/close (0 -> 1 -> 0)
                    // Map time (0 to duration) to (0 to PI)
                    const tMap = (timeSinceTrigger / blinkDuration) * Math.PI;
                    blinkIntensity = Math.sin(tMap);
                    // console.log("BLINKING NOW! Intensity:", blinkIntensity);
                } else {
                    // Blink finished
                    blinkTimer.current = 0;
                    nextBlinkInterval.current = 2 + Math.random() * 4; // Reset timer for next blink (2-6 seconds)
                    // console.log("Blink Finished. Next in:", nextBlinkInterval.current);
                }
            }

            // Apply to morphs
            if (blinkLeftIndex !== undefined) influences[blinkLeftIndex] = blinkIntensity;
            if (blinkRightIndex !== undefined) influences[blinkRightIndex] = blinkIntensity;

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

        // --- BONE ANIMATION (Added for Jaw/Eyes/Arms) ---
        if (jawRef.current) {
            if (isSpeaking || testSpeak) {
                // Enhanced Dynamic Jaw Movement with Natural Lip Sync
                const t = state.clock.elapsedTime;

                // Create realistic speech patterns with multiple frequencies
                const s1 = Math.sin(t * 12);      // Main syllable rhythm (slower)
                const s2 = Math.sin(t * 28) * 0.3; // Fast micro-movements
                const s3 = Math.sin(t * 5) * 0.4;  // Slow breathing/phrasing pattern
                const s4 = Math.cos(t * 18) * 0.2; // Additional variation

                // Combine and normalize to 0..1 range
                let wave = (s1 + s2 + s3 + s4 + 2) / 4;
                wave = Math.max(0, Math.min(1, wave)); // Clamp to 0-1

                // More subtle intensity for natural movement
                const intensity = 0.15; // Reduced from 0.18
                const movementX = wave * intensity; // Primary jaw opening (down)

                // Add horizontal movement for more natural lip sync
                const movementY = Math.sin(t * 22) * 0.03; // Subtle side-to-side

                if (debugJaw) {
                    // Manual Calibration Mode
                    jawRef.current.rotation.x = 0;
                    jawRef.current.rotation.y = 0;
                    jawRef.current.rotation.z = 1.65;
                    jawRef.current.rotation[jawAxis] = jawValue;
                } else {
                    // Enhanced Animation Mode with multi-axis movement
                    // X-axis: Primary jaw opening (up/down)
                    const jawRotationX = new THREE.Quaternion();
                    const localXAxis = new THREE.Vector3(1, 0, 0);
                    jawRotationX.setFromAxisAngle(localXAxis, movementX);

                    // Y-axis: Subtle horizontal movement (side-to-side)
                    const jawRotationY = new THREE.Quaternion();
                    const localYAxis = new THREE.Vector3(0, 1, 0);
                    jawRotationY.setFromAxisAngle(localYAxis, movementY);

                    // Combine all rotations: base -> X rotation -> Y rotation
                    jawTargetQuaternion.current
                        .copy(jawBaseQuaternion.current)
                        .multiply(jawRotationX)
                        .multiply(jawRotationY);

                    // Smoother interpolation for more fluid movement
                    jawRef.current.quaternion.slerp(jawTargetQuaternion.current, 0.25);
                }

                // --- ENHANCED VISEME CYCLING ---
                // Alternate between "Ah" (wide) and "O" (narrow) shapes
                const shapeCycle = Math.sin(t * 2.5); // Slightly slower cycle
                const isO_Shape = shapeCycle > 0.3;

                // "O" SHAPE: Narrow jaw horizontally
                // "Ah" SHAPE: Wide jaw (normal width)
                const targetScaleX = (isO_Shape && wave > 0.3) ? 0.75 : 1.0;

                // Smooth transition between shapes
                jawRef.current.scale.x = THREE.MathUtils.lerp(jawRef.current.scale.x, targetScaleX, 0.15);

            } else {
                // Return to neutral position smoothly
                jawRef.current.quaternion.slerp(jawBaseQuaternion.current, 0.15);
                jawRef.current.scale.x = THREE.MathUtils.lerp(jawRef.current.scale.x, 1, 0.15);
            }
        }

        // --- GLOBAL HEAD MOVEMENT (Idle + Face Tracking + Speech Motion) ---
        if (headBoneRef.current) {
            const t = state.clock.elapsedTime;

            // Idle Wobble (gentle breathing motion)
            const wobbleX = Math.sin(t * 1.2) * 0.03;
            const wobbleZ = Math.cos(t * 0.8) * 0.02;

            // Speech-Induced Micro-Movements (when speaking)
            let speechBobX = 0;
            let speechBobY = 0;
            if (isSpeaking || testSpeak) {
                // Subtle head bob synchronized with speech rhythm
                speechBobX = Math.sin(t * 11) * 0.025;  // Slight nod
                speechBobY = Math.cos(t * 13) * 0.015;  // Slight turn
            }

            // Face Tracking (Head turns slightly towards user)
            // facePosition.x is -1 (left) to 1 (right) inverted? 
            // Usually if user is on left of screen, they are on my right? 
            // Let's assume standard webcam mirror: moving head left = x negative.
            const trackX = (facePosition.x || 0) * 0.3; // Limit head turn
            const trackY = (facePosition.y || 0) * 0.2; // Limit head tilt

            // Combine Idle + Tracking + Speech Motion
            const targetX = wobbleX + (-trackY) + speechBobX; // Look up/down + speech nod
            const targetY = (-trackX) + speechBobY;           // Look left/right + speech turn

            headBoneRef.current.rotation.x = THREE.MathUtils.lerp(headBoneRef.current.rotation.x, targetX, 0.1);
            headBoneRef.current.rotation.y = THREE.MathUtils.lerp(headBoneRef.current.rotation.y, targetY, 0.1);
            headBoneRef.current.rotation.z = THREE.MathUtils.lerp(headBoneRef.current.rotation.z, wobbleZ, 0.1);
        }

        // --- EYE TRACKING ---
        if (leftEyeBoneRef.current && rightEyeBoneRef.current) {
            const scaleY = 1.0 - blinkIntensity;
            leftEyeBoneRef.current.scale.set(1, scaleY, 1);
            rightEyeBoneRef.current.scale.set(1, scaleY, 1);

            // Eye Gaze - DISABLED (user preference: eyes look odd when moving)
            // Head tracking is sufficient for natural look
            /*
            const eyeX = (facePosition.x || 0) * 0.8; 
            const eyeY = (facePosition.y || 0) * 0.8;

            const offsetX = -eyeY;
            const offsetY = -eyeX;

            const baseLeft = eyeBaseRotation.current.left;
            const baseRight = eyeBaseRotation.current.right;

            leftEyeBoneRef.current.rotation.x = THREE.MathUtils.lerp(leftEyeBoneRef.current.rotation.x, baseLeft.x + offsetX, 0.2);
            leftEyeBoneRef.current.rotation.y = THREE.MathUtils.lerp(leftEyeBoneRef.current.rotation.y, baseLeft.y + offsetY, 0.2);

            rightEyeBoneRef.current.rotation.x = THREE.MathUtils.lerp(rightEyeBoneRef.current.rotation.x, baseRight.x + offsetX, 0.2);
            rightEyeBoneRef.current.rotation.y = THREE.MathUtils.lerp(rightEyeBoneRef.current.rotation.y, baseRight.y + offsetY, 0.2);
            */


        }


        if (leftUpperArmRef.current) leftUpperArmRef.current.scale.set(0, 0, 0);
        if (leftForeArmRef.current) leftForeArmRef.current.scale.set(0, 0, 0);
        if (rightUpperArmRef.current) rightUpperArmRef.current.scale.set(0, 0, 0);
        if (rightForeArmRef.current) rightForeArmRef.current.scale.set(0, 0, 0);

        // Fix Hair Alignment (Snap to Head Position/Rotation if drifting)
        // Heuristic: If we have a dedicated hair bone or mesh, ensure it follows head
        // Hair alignment is now handled in useEffect (bone attachment)


        if (leftUpperArmRef.current) {
            leftUpperArmRef.current.rotation.x = THREE.MathUtils.degToRad(shoulderX);
            leftUpperArmRef.current.rotation.y = THREE.MathUtils.degToRad(shoulderY);
            leftUpperArmRef.current.rotation.z = THREE.MathUtils.degToRad(shoulderZ);
        }
        if (leftForeArmRef.current) {
            leftForeArmRef.current.rotation.x = THREE.MathUtils.degToRad(elbowX);
            leftForeArmRef.current.rotation.y = THREE.MathUtils.degToRad(elbowY);
            leftForeArmRef.current.rotation.z = THREE.MathUtils.degToRad(elbowZ);
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
            {showDebugPanel && (
                <Html position={[0, 1.5, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]} eps={0.1}>
                    <div style={{
                        position: 'absolute',
                        width: '300px',
                        top: '-100px',
                        left: '100px',
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
                        <h1 style={{ color: 'yellow', fontSize: '24px' }}>Morph: {debugMorphIndex}</h1>
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
    // Hoodie Transform Constants (Controls hidden)
    const position = [0, 0.28, 0];
    const rotation = [0, 0, 0];
    const scale = [1.5, 1.5, 1.5];

    return <primitive object={scene} position={position} rotation={rotation} scale={scale} />;
}

useGLTF.preload(MODEL_URL);
useGLTF.preload('/models/hoodie/scene.gltf');