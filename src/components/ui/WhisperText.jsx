import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, Html } from '@react-three/drei';
import { EffectComposer, Outline } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

// Custom shader material for whisper text effects
class WhisperMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1.0 },
        uNoiseScale: { value: 2.0 },
        uSpeed: { value: 1.0 },
        uDistortion: { value: 0.1 },
        uBloom: { value: 0.5 },
        uAlpha: { value: 1.0 },
        uColor: { value: new THREE.Color('#FFD700') },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uHover: { value: 0.0 }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uDistortion;
        uniform float uSpeed;
        uniform vec2 uMouse;
        uniform float uHover;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vNoise;
        
        // Simplex noise function
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
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          // Generate noise for distortion
          float noise = snoise(vec2(
            position.x * 0.5 + uTime * uSpeed,
            position.y * 0.5 + uTime * uSpeed
          ));
          
          vNoise = noise;
          
          // Apply distortion
          vec3 distortedPosition = position;
          distortedPosition.x += noise * uDistortion;
          distortedPosition.y += noise * uDistortion * 0.5;
          
          // Mouse interaction
          if (uHover > 0.0) {
            vec2 mouseDir = uMouse - position.xy;
            float mouseDist = length(mouseDir);
            float influence = smoothstep(0.5, 0.0, mouseDist) * uHover;
            distortedPosition.xy += normalize(mouseDir) * influence * 0.5;
          }
          
          // Gentle floating animation
          distortedPosition.y += sin(uTime + position.x) * 0.02;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(distortedPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform float uNoiseScale;
        uniform float uBloom;
        uniform float uAlpha;
        uniform vec3 uColor;
        uniform vec2 uResolution;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vNoise;
        
        // More noise functions
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          
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
          // Base color with noise-based variation
          vec3 baseColor = uColor * uIntensity;
          
          // Add noise-based shimmer
          float shimmer = fbm(vUv * uNoiseScale + uTime * 0.5);
          baseColor *= 0.8 + shimmer * 0.4;
          
          // Edge glow
          float edge = smoothstep(0.0, 0.1, vUv.x) * 
                      smoothstep(1.0, 0.9, vUv.x) *
                      smoothstep(0.0, 0.1, vUv.y) *
                      smoothstep(1.0, 0.9, vUv.y);
          
          // Distortion wave effect
          float wave = sin(vPosition.x * 10.0 + uTime * 3.0) * 0.5 + 0.5;
          
          // Combine effects
          float alpha = uAlpha * (0.7 + wave * 0.3) * (0.8 + edge * 0.2);
          alpha *= 0.8 + vNoise * 0.2;
          
          // Bloom effect
          vec3 bloom = baseColor * uBloom * (1.0 + wave * 0.5);
          
          // Final color
          vec3 finalColor = baseColor + bloom;
          
          gl_FragColor = vec4(finalColor, alpha);
          
          // Premultiplied alpha for better blending
          gl_FragColor.rgb *= alpha;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendEquation: THREE.AddEquation
    });
  }
}

// Floating text particles around main text
const FloatingGlyphs = ({ count = 20, text = "", color = "#FFD700" }) => {
  const glyphsRef = useRef();
  const [glyphs, setGlyphs] = useState([]);
  
  useEffect(() => {
    const chars = text.split('').filter(char => char.trim() !== '');
    const newGlyphs = [];
    
    for (let i = 0; i < Math.min(count, chars.length * 3); i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      newGlyphs.push({
        id: i,
        char,
        position: [
          (Math.random() - 0.5) * 3,
          Math.random() * 2 - 1,
          (Math.random() - 0.5) * 2
        ],
        scale: 0.1 + Math.random() * 0.2,
        speed: 0.5 + Math.random() * 1,
        rotation: [
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ]
      });
    }
    
    setGlyphs(newGlyphs);
  }, [text, count]);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (glyphsRef.current) {
      glyphsRef.current.children.forEach((glyph, i) => {
        if (glyph && glyphs[i]) {
          const speed = glyphs[i].speed;
          glyph.position.y += Math.sin(time * speed + i) * 0.01;
          glyph.rotation.y = time * 0.5 + i;
          glyph.rotation.x = Math.sin(time * speed * 0.7 + i) * 0.1;
        }
      });
    }
  });
  
  return (
    <group ref={glyphsRef}>
      {glyphs.map((glyph) => (
        <Text
          key={glyph.id}
          position={glyph.position}
          rotation={glyph.rotation}
          fontSize={glyph.scale}
          color={color}
          anchorX="center"
          anchorY="middle"
          opacity={0.3}
        >
          {glyph.char}
        </Text>
      ))}
    </group>
  );
};

// Main WhisperText component
const WhisperText = ({ 
  message = "A chest needs two hearts.",
  position = [0, 2, 0],
  intensity = 1.0,
  color = "#FFD700",
  duration = 3.0,
  size = 0.5,
  withEffects = true,
  onComplete
}) => {
  const textRef = useRef();
  const materialRef = useRef();
  const containerRef = useRef();
  const { camera, mouse } = useThree();
  
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(1.0);
  const [hover, setHover] = useState(0);
  const [displayText, setDisplayText] = useState("");
  
  // Typewriter effect
  useEffect(() => {
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex <= message.length) {
        setDisplayText(message.substring(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        
        // Start fade out after duration
        setTimeout(() => {
          const fadeInterval = setInterval(() => {
            setFade(prev => {
              const next = prev - 0.02;
              if (next <= 0) {
                clearInterval(fadeInterval);
                setVisible(false);
                if (onComplete) onComplete();
                return 0;
              }
              return next;
            });
          }, 20);
        }, duration * 1000);
      }
    }, 50);
    
    return () => clearInterval(typeInterval);
  }, [message, duration, onComplete]);
  
  // Mouse interaction
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (textRef.current) {
        const rect = textRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        setHover(0.5);
        
        if (materialRef.current) {
          materialRef.current.uniforms.uMouse.value.set(x, y);
          materialRef.current.uniforms.uHover.value = 0.5;
        }
      }
    };
    
    const handleMouseLeave = () => {
      setHover(0);
      if (materialRef.current) {
        materialRef.current.uniforms.uHover.value = 0;
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  
  // Animation frame
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uAlpha.value = fade;
      materialRef.current.uniforms.uIntensity.value = intensity * (0.8 + Math.sin(time) * 0.2);
    }
    
    // Gentle floating animation
    if (containerRef.current) {
      containerRef.current.position.y = position[1] + Math.sin(time) * 0.05;
      containerRef.current.rotation.y = Math.sin(time * 0.2) * 0.1;
    }
  });
  
  // Calculate font size based on message length
  const fontSize = useMemo(() => {
    const length = message.length;
    if (length > 30) return size * 0.4;
    if (length > 20) return size * 0.6;
    if (length > 10) return size * 0.8;
    return size;
  }, [message, size]);
  
  if (!visible) return null;
  
  return (
    <group ref={containerRef} position={position}>
      {/* Main text with custom material */}
      <Text
        ref={textRef}
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        maxWidth={4}
        lineHeight={1.2}
        textAlign="center"
      >
        {displayText}
        <whisperMaterial
          ref={materialRef}
          uniforms-uColor-value={new THREE.Color(color)}
          uniforms-uIntensity-value={intensity}
        />
      </Text>
      
      {/* Floating glyph particles */}
      {withEffects && (
        <>
          <FloatingGlyphs 
            count={Math.min(message.length * 2, 40)} 
            text={message}
            color={color}
          />
          
          {/* Glow particles */}
          <GlowParticles 
            count={30}
            color={color}
            intensity={intensity}
          />
          
          {/* Outline effect */}
          <EffectComposer>
            <Outline
              blendFunction={BlendFunction.SCREEN}
              edgeStrength={3}
              pulseSpeed={0.5}
              visibleEdgeColor={color}
              hiddenEdgeColor={0x000000}
              blur={true}
              blurPass={true}
            />
          </EffectComposer>
        </>
      )}
      
      {/* Cursor interaction indicator */}
      {hover > 0 && (
        <Html
          position={[0, -fontSize * 0.7, 0]}
          center
          style={{
            color: color,
            fontSize: '0.8rem',
            opacity: hover,
            transition: 'opacity 0.3s',
            whiteSpace: 'nowrap'
          }}
        >
          ✨
        </Html>
      )}
    </group>
  );
};

// Glow particles around text
const GlowParticles = ({ count = 20, color = "#FFD700", intensity = 1.0 }) => {
  const particlesRef = useRef();
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 0.5 + Math.random() * 1.5;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 2;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return positions;
  }, [count]);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.2;
      
      const positions = particlesRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        positions[iy] += Math.sin(time + i) * 0.01;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05 * intensity}
        color={color}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

// WhisperText variants for different states
export const StateAWhisper = (props) => (
  <WhisperText
    color="#A0D2FF"
    intensity={0.8}
    size={0.4}
    withEffects={true}
    {...props}
  />
);

export const StateBWhisper = (props) => (
  <WhisperText
    color="#FFD700"
    intensity={1.0}
    size={0.5}
    withEffects={true}
    {...props}
  />
);

export const StateCWhisper = (props) => (
  <WhisperText
    color="#FF6B6B"
    intensity={1.2}
    size={0.6}
    withEffects={false}
    {...props}
  />
);

export const StateDWhisper = (props) => (
  <WhisperText
    color="#00FFAA"
    intensity={1.5}
    size={0.7}
    withEffects={true}
    {...props}
  />
);

export default WhisperText;