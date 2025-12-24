import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, Scanline } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';

// Custom portal shader material
class PortalMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uIntensity: { value: 1.0 },
        uColor1: { value: new THREE.Color('#FFD700') },
        uColor2: { value: new THREE.Color('#6B6BFF') },
        uNoiseScale: { value: 3.0 },
        uDistortion: { value: 0.5 },
        uSpeed: { value: 1.0 },
        uTwist: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uDistortion;
        uniform float uSpeed;
        uniform float uTwist;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vProgress;
        
        // Complex noise for distortion
        float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
        float noise(vec2 x) {
          vec2 i = floor(x);
          vec2 f = fract(x);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        
        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for (int i = 0; i < 5; i++) {
            value += amplitude * noise(st * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
          }
          return value;
        }
        
        void main() {
          vUv = uv;
          vPosition = position;
          vProgress = uProgress;
          
          // Base distortion
          float distortion = fbm(vec2(
            position.x * 0.5 + uTime * uSpeed,
            position.y * 0.5 + uTime * uSpeed * 0.7
          )) * uDistortion;
          
          // Progress-based expansion
          float expansion = uProgress * 2.0;
          
          // Spiral twist effect
          float twist = uTwist * uProgress;
          float radius = length(position.xy);
          float angle = atan(position.y, position.x) + twist * radius;
          
          // Combine effects
          vec3 distortedPosition = position;
          distortedPosition.x = cos(angle) * (radius + distortion * expansion);
          distortedPosition.y = sin(angle) * (radius + distortion * expansion);
          distortedPosition.z += distortion * 0.5;
          
          // Progress-based scaling
          distortedPosition *= 1.0 + uProgress * 2.0;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(distortedPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uIntensity;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uNoiseScale;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vProgress;
        
        // More noise functions
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                             -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                         + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                                 dot(x12.zw, x12.zw)), 0.0);
          m = m * m;
          m = m * m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for (int i = 0; i < 5; i++) {
            value += amplitude * snoise(st * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
          }
          return value;
        }
        
        // Radial gradient
        float radial(vec2 uv, vec2 center) {
          return 1.0 - length(uv - center);
        }
        
        // Spiral function
        float spiral(vec2 uv, float turns) {
          float angle = atan(uv.y, uv.x);
          float radius = length(uv);
          return sin(angle * turns + radius * 10.0 - uTime * 2.0) * 0.5 + 0.5;
        }
        
        void main() {
          // Center coordinates
          vec2 centeredUv = vUv * 2.0 - 1.0;
          
          // Multiple noise layers
          float noise1 = fbm(centeredUv * uNoiseScale + uTime * 0.3);
          float noise2 = fbm(centeredUv * uNoiseScale * 2.0 - uTime * 0.2);
          float noise3 = fbm(centeredUv * uNoiseScale * 4.0 + uTime * 0.1);
          
          // Combine noises
          float combinedNoise = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
          
          // Radial gradient
          float radialGrad = radial(centeredUv, vec2(0.0));
          
          // Spiral pattern
          float spiralPattern = spiral(centeredUv, 5.0);
          
          // Progress-based mixing
          float progressMix = vProgress;
          
          // Color mixing
          vec3 color1 = uColor1 * uIntensity;
          vec3 color2 = uColor2 * uIntensity;
          
          // Dynamic color based on noise and progress
          vec3 finalColor = mix(color1, color2, combinedNoise * progressMix);
          finalColor += spiralPattern * 0.3 * progressMix;
          finalColor *= radialGrad * 2.0;
          
          // Alpha calculation
          float alpha = radialGrad * combinedNoise * progressMix;
          alpha = clamp(alpha * 2.0, 0.0, 1.0);
          
          // Edge glow
          float edge = smoothstep(0.8, 1.0, radialGrad);
          finalColor += edge * 0.5;
          
          // Final output
          gl_FragColor = vec4(finalColor, alpha * uIntensity);
          
          // Premultiplied alpha for additive blending
          gl_FragColor.rgb *= alpha;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }
}

extend({ PortalMaterial });

// Portal Ring Component
const PortalRing = ({ progress = 0, intensity = 1.0, twist = 2.0 }) => {
  const ringRef = useRef();
  const materialRef = useRef();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uProgress.value = progress;
      materialRef.current.uniforms.uTwist.value = twist;
      materialRef.current.uniforms.uIntensity.value = intensity;
    }
    
    if (ringRef.current) {
      // Rotation based on progress
      ringRef.current.rotation.z = time * 0.5 * progress;
      ringRef.current.rotation.x = time * 0.3 * progress;
      
      // Scale based on progress
      const scale = 1.0 + progress * 3.0;
      ringRef.current.scale.setScalar(scale);
    }
  });
  
  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[1.0, 0.1, 32, 100]} />
      <portalMaterial
        ref={materialRef}
        uniforms-uColor1-value={new THREE.Color('#FFD700')}
        uniforms-uColor2-value={new THREE.Color('#6B6BFF')}
      />
    </mesh>
  );
};

// Particle Burst for transitions
const ParticleBurst = ({ count = 100, speed = 2.0, color = '#FFD700', life = 1.0 }) => {
  const particlesRef = useRef();
  const [active, setActive] = useState(true);
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      position: [0, 0, 0],
      velocity: [
        (Math.random() - 0.5) * speed * 2,
        (Math.random() - 0.5) * speed * 2,
        (Math.random() - 0.5) * speed * 2
      ],
      life: life,
      size: 0.1 + Math.random() * 0.2,
      color: color
    }));
    setParticles(newParticles);
    
    const timer = setTimeout(() => setActive(false), life * 1000);
    return () => clearTimeout(timer);
  }, [count, speed, color, life]);
  
  useFrame((state, delta) => {
    if (!active || !particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array;
    
    particles.forEach((particle, i) => {
      if (particle.life <= 0) return;
      
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;
      
      // Update position
      positions[ix] += particle.velocity[0] * delta;
      positions[iy] += particle.velocity[1] * delta;
      positions[iz] += particle.velocity[2] * delta;
      
      // Slow down
      particle.velocity[0] *= 0.95;
      particle.velocity[1] *= 0.95;
      particle.velocity[2] *= 0.95;
      
      // Decay life
      particle.life -= delta;
      
      // Fade out
      if (particle.life < 0.2) {
        const fade = particle.life / 0.2;
        positions[ix] *= fade;
        positions[iy] *= fade;
        positions[iz] *= fade;
      }
    });
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  if (!active) return null;
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={new Float32Array(count * 3)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

// Main TransitionOverlay Component
const TransitionOverlay = ({ 
  type = 'chestOpen',
  duration = 2.0,
  intensity = 1.0,
  color = '#FFD700',
  onComplete
}) => {
  const overlayRef = useRef();
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(true);
  const [phase, setPhase] = useState('enter'); // 'enter', 'hold', 'exit'
  
  const { scene, camera } = useThree();
  
  // Transition configurations
  const transitionConfig = useMemo(() => {
    const configs = {
      chestOpen: {
        rings: 3,
        particles: 200,
        speed: 1.5,
        twist: 3.0,
        colors: ['#FFD700', '#FF6B6B', '#6B6BFF'],
        bloom: 1.5
      },
      sceneChange: {
        rings: 2,
        particles: 100,
        speed: 1.0,
        twist: 1.5,
        colors: ['#00FFAA', '#6B6BFF', '#FFD700'],
        bloom: 1.0
      },
      stateChange: {
        rings: 1,
        particles: 50,
        speed: 0.8,
        twist: 1.0,
        colors: ['#A0D2FF', '#FFD700'],
        bloom: 0.8
      },
      error: {
        rings: 2,
        particles: 150,
        speed: 2.0,
        twist: 5.0,
        colors: ['#FF6B6B', '#FF0000', '#000000'],
        bloom: 2.0
      }
    };
    
    return configs[type] || configs.chestOpen;
  }, [type]);
  
  // Progress animation
  useEffect(() => {
    let startTime = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const newProgress = Math.min(elapsed / duration, 1);
      
      setProgress(newProgress);
      
      // Phase management
      if (newProgress < 0.3) {
        setPhase('enter');
      } else if (newProgress < 0.7) {
        setPhase('hold');
      } else {
        setPhase('exit');
      }
      
      if (newProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        setActive(false);
        if (onComplete) onComplete();
      }
    };
    
    animate();
    
    // Add screen shake for certain transitions
    if (type === 'chestOpen' || type === 'error') {
      const originalPosition = camera.position.clone();
      const shakeInterval = setInterval(() => {
        if (phase === 'hold') {
          const intensity = type === 'error' ? 0.1 : 0.05;
          camera.position.x = originalPosition.x + (Math.random() - 0.5) * intensity;
          camera.position.y = originalPosition.y + (Math.random() - 0.5) * intensity;
        }
      }, 50);
      
      return () => {
        clearInterval(shakeInterval);
        camera.position.copy(originalPosition);
      };
    }
  }, [duration, type, phase, camera, onComplete]);
  
  // Post-processing effects
  useEffect(() => {
    if (!overlayRef.current) return;
    
    // Add lens flare effect
    const addLensFlare = () => {
      const lensFlare = new THREE.Lensflare();
      const textureLoader = new THREE.TextureLoader();
      
      const textureFlare0 = textureLoader.load('/textures/lensflare0.png');
      const textureFlare3 = textureLoader.load('/textures/lensflare3.png');
      
      lensFlare.addElement(new THREE.LensflareElement(textureFlare0, 700, 0, new THREE.Color(color)));
      lensFlare.addElement(new THREE.LensflareElement(textureFlare3, 60, 0.6));
      lensFlare.addElement(new THREE.LensflareElement(textureFlare3, 70, 0.7));
      lensFlare.addElement(new THREE.LensflareElement(textureFlare3, 120, 0.9));
      lensFlare.addElement(new THREE.LensflareElement(textureFlare3, 70, 1));
      
      overlayRef.current.add(lensFlare);
    };
    
    if (type === 'chestOpen') {
      addLensFlare();
    }
    
    return () => {
      // Clean up
    };
  }, [type, color]);
  
  // Calculate ring parameters
  const getRingParams = (index) => {
    const offset = index * 0.3;
    const ringProgress = Math.max(0, (progress - offset) / 0.7);
    const ringIntensity = intensity * (1 - index * 0.2);
    const ringTwist = transitionConfig.twist * (1 + index * 0.5);
    
    return {
      progress: ringProgress,
      intensity: ringIntensity,
      twist: ringTwist
    };
  };
  
  if (!active) return null;
  
  return (
    <group ref={overlayRef}>
      {/* Multiple portal rings */}
      {Array.from({ length: transitionConfig.rings }).map((_, i) => {
        const params = getRingParams(i);
        return (
          <PortalRing
            key={`ring-${i}`}
            progress={params.progress}
            intensity={params.intensity}
            twist={params.twist}
          />
        );
      })}
      
      {/* Particle bursts */}
      <ParticleBurst
        count={transitionConfig.particles}
        speed={transitionConfig.speed}
        color={transitionConfig.colors[0]}
        life={duration}
      />
      
      {/* Additional particles with different colors */}
      {transitionConfig.colors.slice(1).map((color, i) => (
        <ParticleBurst
          key={`particles-${i}`}
          count={Math.floor(transitionConfig.particles / 2)}
          speed={transitionConfig.speed * (1 + i * 0.3)}
          color={color}
          life={duration * 0.8}
        />
      ))}
      
      {/* Full screen overlay */}
      <mesh>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial
          color={type === 'error' ? '#FF0000' : '#000000'}
          transparent
          opacity={progress * 0.3}
          depthWrite={false}
        />
      </mesh>
      
      {/* Transition type indicator */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color={transitionConfig.colors[0]}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.1}
        outlineColor="#000"
        opacity={Math.sin(progress * Math.PI) * intensity}
      >
        {type === 'chestOpen' ? 'CHEST OPENING' : 
         type === 'sceneChange' ? 'SCENE CHANGE' :
         type === 'stateChange' ? 'STATE CHANGE' : 'ERROR'}
      </Text>
      
      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={transitionConfig.bloom * intensity * progress}
          kernelSize={3}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.1}
        />
        
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[progress * 0.01, progress * 0.01]}
        />
        
        <Vignette
          darkness={progress * 0.5}
          offset={0.3}
          eskil={false}
        />
        
        {type === 'error' && (
          <Scanline
            density={progress * 2}
            blendFunction={BlendFunction.OVERLAY}
          />
        )}
      </EffectComposer>
      
      {/* Distorted sphere in center */}
      {phase === 'hold' && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <MeshDistortMaterial
            color={transitionConfig.colors[0]}
            emissive={transitionConfig.colors[0]}
            emissiveIntensity={1.0}
            distort={0.5}
            speed={2}
            roughness={0.1}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
      
      {/* Sound effect trigger (would need audio context) */}
      {/* <Audio src="/sounds/transition.mp3" play={progress > 0.1 && progress < 0.2} /> */}
    </group>
  );
};

// Quick transition variants
export const ChestOpenTransition = (props) => (
  <TransitionOverlay
    type="chestOpen"
    duration={2.5}
    intensity={1.5}
    color="#FFD700"
    {...props}
  />
);

export const SceneChangeTransition = (props) => (
  <TransitionOverlay
    type="sceneChange"
    duration={1.5}
    intensity={1.0}
    color="#00FFAA"
    {...props}
  />
);

export const ErrorTransition = (props) => (
  <TransitionOverlay
    type="error"
    duration={3.0}
    intensity={2.0}
    color="#FF6B6B"
    {...props}
  />
);

export const QuickFade = ({ duration = 0.5, color = '#000000', onComplete }) => {
  const [opacity, setOpacity] = useState(0);
  
  useEffect(() => {
    let mounted = true;
    let opacityValue = 0;
    let direction = 1;
    
    const animate = () => {
      if (!mounted) return;
      
      opacityValue += (direction * 0.02) / duration;
      
      if (opacityValue >= 1) {
        opacityValue = 1;
        direction = -1;
      } else if (opacityValue <= 0 && direction === -1) {
        if (onComplete) onComplete();
        return;
      }
      
      setOpacity(opacityValue);
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      mounted = false;
    };
  }, [duration, onComplete]);
  
  return (
    <mesh>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
};

export default TransitionOverlay;