import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Using a working Ready Player Me avatar with facial expressions and visemes
const MODEL_URL = "https://models.readyplayer.me/65d3f9c234d2ba21fa6fb3d7.glb?morphTargets=ARKit&textureAtlas=1024";

export default function Avatar({ isSpeaking, audioData, setDebugInfo }) {
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

        // Look for mesh with viseme morphs
        if (keys.some(k => k.includes('viseme'))) {
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
        const visemeCount = Object.keys(foundMorphs).filter(m => m.includes('viseme')).length;
        setDebugInfo(`Mesh: ${foundMesh.name}\nVisemes: ${visemeCount}\nTotal Morphs: ${Object.keys(foundMorphs).length}`);
      }
    } else {
      if (setDebugInfo) setDebugInfo("No mesh with morph targets found.");
    }
  }, [scene, setDebugInfo]);

  // Advanced lip sync animation
  useFrame((state) => {
    if (!headMeshRef.current || !headMeshRef.current.morphTargetInfluences) return;

    const t = state.clock.elapsedTime;
    const influences = headMeshRef.current.morphTargetInfluences;

    // Eye blinking animation
    eyeBlinkTimer.current += 0.016; // ~60fps
    if (eyeBlinkTimer.current > 3 + Math.random() * 2) {
      eyeBlinkTimer.current = 0;
    }

    const blinkProgress = eyeBlinkTimer.current < 0.15 ? Math.sin(eyeBlinkTimer.current * Math.PI / 0.15) : 0;

    if (morphTargets['eyeBlinkLeft'] !== undefined) {
      influences[morphTargets['eyeBlinkLeft']] = blinkProgress * 0.8;
    }
    if (morphTargets['eyeBlinkRight'] !== undefined) {
      influences[morphTargets['eyeBlinkRight']] = blinkProgress * 0.8;
    }

    // Lip sync based on speaking state
    if (isSpeaking) {
      // Create realistic speech patterns using multiple frequencies
      const baseFreq = 8.0;  // Base speech frequency
      const vowelFreq = 4.0; // Vowel change frequency

      // Generate speech waveforms
      const jawOpen = Math.abs(Math.sin(t * baseFreq)) * 0.6;
      const lipPucker = Math.abs(Math.sin(t * baseFreq * 0.7 + 1)) * 0.4;
      const lipWide = Math.abs(Math.sin(t * baseFreq * 0.9 + 2)) * 0.5;

      // Vowel cycling for more natural speech
      const vowelCycle = Math.sin(t * vowelFreq);

      // Map to visemes (phoneme-to-viseme mapping)
      const visemeValues = {
        'viseme_aa': jawOpen * (vowelCycle > 0.5 ? 1 : 0.3),  // "ah" sound
        'viseme_E': lipWide * (vowelCycle < -0.3 ? 1 : 0.2),   // "eh" sound
        'viseme_I': lipWide * 0.6 * (vowelCycle > 0 ? 1 : 0.3), // "ee" sound
        'viseme_O': lipPucker * (vowelCycle < 0 ? 1 : 0.2),    // "oh" sound
        'viseme_U': lipPucker * 0.8,                            // "oo" sound
        'viseme_CH': jawOpen * 0.3,                             // "ch" sound
        'viseme_DD': jawOpen * 0.4,                             // "d" sound
        'viseme_FF': lipWide * 0.3,                             // "f" sound
        'viseme_kk': jawOpen * 0.2,                             // "k" sound
        'viseme_PP': lipPucker * 0.5,                           // "p" sound
        'viseme_SS': lipWide * 0.2,                             // "s" sound
        'viseme_TH': jawOpen * 0.3,                             // "th" sound
        'viseme_RR': lipPucker * 0.4,                           // "r" sound
        'viseme_sil': 0                                          // silence
      };

      // Apply viseme values with smooth interpolation
      Object.entries(visemeValues).forEach(([viseme, targetValue]) => {
        if (morphTargets[viseme] !== undefined) {
          const currentValue = influences[morphTargets[viseme]];
          influences[morphTargets[viseme]] = THREE.MathUtils.lerp(
            currentValue,
            targetValue,
            0.25  // Smooth interpolation
          );
        }
      });

      // Fallback for models without standard visemes
      if (morphTargets['mouthOpen'] !== undefined) {
        influences[morphTargets['mouthOpen']] = THREE.MathUtils.lerp(
          influences[morphTargets['mouthOpen']],
          jawOpen,
          0.2
        );
      }

    } else {
      // Return to neutral position when not speaking
      Object.keys(morphTargets).forEach((key) => {
        if (key.includes('viseme') || key.includes('mouth')) {
          const idx = morphTargets[key];
          influences[idx] = THREE.MathUtils.lerp(influences[idx], 0, 0.15);
        }
      });
    }

    // Subtle idle animations
    if (!isSpeaking) {
      // Slight breathing movement
      const breathe = Math.sin(t * 0.5) * 0.02;
      if (morphTargets['mouthSmile'] !== undefined) {
        influences[morphTargets['mouthSmile']] = breathe + 0.05;
      }
    }
  });

  return (
    <primitive
      object={scene}
      position={[0, -1.6, 0]}
      scale={[1.4, 1.4, 1.4]}
      rotation={[0, 0, 0]}
    />
  );
}
