import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { Points, PointMaterial, Trail, Float, Text } from '@react-three/drei';

// Custom particle material with advanced effects
class MagicalParticleMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.1 },
        uPixelRatio: { value: typeof window !== 'undefined' ? window.devicePixelRatio : 1 },
        uColor1: { value: new THREE.Color('#FFD700') },
        uColor2: { value: new THREE.Color('#FF6B6B') },
        uColor3: { value: new THREE.Color('#6B6BFF') },
        uIntensity: { value: 1.0 },
        uNoiseScale: { value: 2.0 },
        uHover: { value: 0.0 },
        uSway: { value: 0.5 },
        uBloom: { value: 0.8 }
      },
      vertexShader: `
        attribute float aScale;
        attribute float aSpeed;
        attribute float aOffset;
        attribute float aType;
        attribute vec3 aColor;
        
        uniform float uTime;
        uniform float uSize;
        uniform float uPixelRatio;
        uniform float uHover;
        uniform float uSway;
        uniform float uBloom;
        
        varying vec3 vColor;
        varying float vType;
        varying float vLife;
        
        // 3D noise function
        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
        vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
        
        float cnoise(vec3 P){
          vec3 Pi0 = floor(P);
          vec3 Pi1 = Pi0 + vec3(1.0);
          Pi0 = mod(Pi0, 289.0);
          Pi1 = mod(Pi1, 289.0);
          vec3 Pf0 = fract(P);
          vec3 Pf1 = Pf0 - vec3(1.0);
          vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
          vec4 iy = vec4(Pi0.yy, Pi1.yy);
          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;
          
          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0);
          vec4 ixy1 = permute(ixy + iz1);
          
          vec4 gx0 = ixy0 / 7.0;
          vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
          gx0 = fract(gx0);
          vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.0));
          gx0 -= sz0 * (step(0.0, gx0) - 0.5);
          gy0 -= sz0 * (step(0.0, gy0) - 0.5);
          
          vec4 gx1 = ixy1 / 7.0;
          vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
          gx1 = fract(gx1);
          vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.0));
          gx1 -= sz1 * (step(0.0, gx1) - 0.5);
          gy1 -= sz1 * (step(0.0, gy1) - 0.5);
          
          vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
          vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
          vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
          vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
          vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
          vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
          
          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g100, g100), dot(g010, g010), dot(g110, g110)));
          g000 *= norm0.x;
          g100 *= norm0.y;
          g010 *= norm0.z;
          g110 *= norm0.w;
          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g101, g101), dot(g011, g011), dot(g111, g111)));
          g001 *= norm1.x;
          g101 *= norm1.y;
          g011 *= norm1.z;
          g111 *= norm1.w;
          
          float n000 = dot(g000, Pf0);
          float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
          float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
          float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
          float n111 = dot(g111, Pf1);
          
          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
          return 2.2 * n_xyz;
        }
        
        void main() {
          vColor = aColor;
          vType = aType;
          
          // Calculate lifetime progress
          vLife = sin(uTime * aSpeed + aOffset) * 0.5 + 0.5;
          
          // Base position with orbital motion
          float orbitRadius = 1.0 + aType * 0.5;
          float angle = uTime * (0.5 + aSpeed * 0.3) + aOffset;
          vec3 orbitPos = vec3(
            cos(angle) * orbitRadius,
            sin(uTime * 0.7 + aOffset) * 0.3,
            sin(angle) * orbitRadius
          );
          
          // Noise-based sway
          float noise = cnoise(position * 2.0 + uTime * 0.5);
          vec3 swayOffset = vec3(
            cos(uTime + aOffset) * uSway * 0.1,
            sin(uTime * 0.8 + aOffset) * uSway * 0.1,
            cos(uTime * 1.2 + aOffset) * uSway * 0.1
          ) * noise;
          
          // Hover effect
          vec3 hoverOffset = vec3(0.0);
          if (uHover > 0.0) {
            float hoverWave = sin(uTime * 3.0 + aOffset * 5.0) * uHover * 0.2;
            hoverOffset = normalize(position) * hoverWave;
          }
          
          // Combine all offsets
          vec3 finalPosition = position + orbitPos + swayOffset + hoverOffset;
          
          // Calculate size with distance fade
          float size = uSize * aScale * (1.0 + vLife * 0.5);
          size *= uPixelRatio;
          
          // Transform to screen space
          vec4 mvPosition = modelViewMatrix * vec4(finalPosition, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (300.0 / -mvPosition.z);
          
          // Bloom intensity
          gl_PointSize *= 1.0 + uBloom * vLife;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform float uIntensity;
        
        varying vec3 vColor;
        varying float vType;
        varying float vLife;
        
        // Circular point sprite
        float circle(vec2 uv, float radius) {
          float d = length(uv);
          return smoothstep(radius, radius * 0.8, d);
        }
        
        // Star shape
        float star(vec2 uv, float size) {
          float angle = atan(uv.y, uv.x);
          float dist = length(uv);
          float star = cos(angle * 5.0) * 0.5 + 0.5;
          return smoothstep(size * 1.2, size, dist * (1.0 - star * 0.3));
        }
        
        // Glow effect
        float glow(vec2 uv, float size) {
          float d = length(uv);
          return exp(-d * d / (size * size));
        }
        
        void main() {
          // Center UV coordinates
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          
          // Choose shape based on particle type
          float alpha = 0.0;
          if (vType < 0.33) {
            // Type 1: Glowing circle
            alpha = circle(uv, 0.8) * glow(uv, 0.5);
          } else if (vType < 0.66) {
            // Type 2: Star
            alpha = star(uv, 0.7) * glow(uv, 0.6);
          } else {
            // Type 3: Hexagon
            float hex = max(
              abs(uv.x * 1.73205 + uv.y),
              abs(uv.x * 1.73205 - uv.y)
            );
            alpha = smoothstep(0.7, 0.6, hex / 1.73205) * glow(uv, 0.4);
          }
          
          // Color based on type and lifetime
          vec3 color;
          if (vType < 0.33) {
            color = mix(uColor1, uColor2, vLife);
          } else if (vType < 0.66) {
            color = mix(uColor2, uColor3, vLife);
          } else {
            color = mix(uColor3, uColor1, vLife);
          }
          
          // Pulsing brightness
          float pulse = sin(uTime * 2.0 + vLife * 3.14) * 0.3 + 0.7;
          color *= pulse * uIntensity;
          
          // Add rainbow effect for some particles
          if (vType > 0.8) {
            float hue = mod(uTime * 0.5 + vLife * 2.0, 1.0);
            color = mix(color, vec3(
              0.5 + 0.5 * cos(hue * 6.283 + 0.0),
              0.5 + 0.5 * cos(hue * 6.283 + 2.094),
              0.5 + 0.5 * cos(hue * 6.283 + 4.188)
            ), 0.5);
          }
          
          // Final output
          gl_FragColor = vec4(color * vColor, alpha * vLife);
          
          // Additive blending
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });
  }
}

extend({ MagicalParticleMaterial });

// Main particle system
const MagicalParticles = ({ 
  count = 500, 
  speed = 0.5, 
  size = 0.05,
  intensity = 1.0,
  colors = ['#FFD700', '#FF6B6B', '#6B6BFF'],
  orbit = true,
  trails = true,
  interactive = true
}) => {
  const pointsRef = useRef();
  const trailsRef = useRef([]);
  const materialRef = useRef();
  const { mouse, viewport, clock } = useThree();
  const [hover, setHover] = useState(0);
  const [sway, setSway] = useState(0.5);
  const [bloom, setBloom] = useState(0.8);
  
  // Generate particle data
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    const offsets = new Float32Array(count);
    const types = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      // Random position in sphere
      const radius = Math.random() * 3 + 1;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Random attributes
      scales[i] = Math.random() * 0.5 + 0.5;
      speeds[i] = Math.random() * 0.5 + 0.5;
      offsets[i] = Math.random() * Math.PI * 2;
      types[i] = Math.random();
      
      // Random color variation
      const colorChoice = Math.floor(Math.random() * 3);
      const r = Math.random() * 0.2 + 0.8;
      const g = Math.random() * 0.2 + 0.8;
      const b = Math.random() * 0.2 + 0.8;
      
      colors[i * 3] = colorChoice === 0 ? r : 0.3;
      colors[i * 3 + 1] = colorChoice === 1 ? g : 0.3;
      colors[i * 3 + 2] = colorChoice === 2 ? b : 0.3;
    }
    
    return { positions, scales, speeds, offsets, types, colors };
  }, [count]);
  
  // Interactive effects
  useEffect(() => {
    if (!interactive) return;
    
    const handleMouseMove = () => {
      setHover(prev => Math.min(prev + 0.1, 1));
    };
    
    const handleMouseLeave = () => {
      setHover(prev => Math.max(prev - 0.1, 0));
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [interactive]);
  
  // Animation frame
  useFrame((state) => {
    const time = clock.getElapsedTime();
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uHover.value = hover;
      materialRef.current.uniforms.uSway.value = sway;
      materialRef.current.uniforms.uBloom.value = bloom;
    }
    
    // Update sway based on time
    setSway(Math.sin(time * 0.3) * 0.5 + 0.5);
    
    // Pulsing bloom
    setBloom(Math.sin(time * 1.5) * 0.2 + 0.8);
    
    // Mouse interaction
    if (pointsRef.current && interactive) {
      const positions = pointsRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        
        // Calculate distance to mouse
        const dx = positions[ix] - mouse.x * 3;
        const dy = positions[iy] - mouse.y * 3;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Repel from mouse
        if (distance < 1) {
          const force = (1 - distance) * 0.1;
          positions[ix] += dx * force;
          positions[iy] += dy * force;
          positions[iz] += Math.sin(time + i) * force * 0.1;
        }
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
    
    // Update trails
    if (trailsRef.current.length > 0 && trails) {
      trailsRef.current.forEach((trail, i) => {
        if (trail) {
          const t = time + i * 0.1;
          trail.position.x = Math.sin(t) * (1 + i * 0.1);
          trail.position.y = Math.cos(t * 0.7) * 0.5;
          trail.position.z = Math.cos(t * 0.3) * (1 + i * 0.1);
        }
      });
    }
  });
  
  // Create individual trail particles
  const trailParticles = useMemo(() => {
    if (!trails) return [];
    
    const trailCount = Math.min(20, count / 25);
    return Array.from({ length: trailCount }, (_, i) => ({
      id: i,
      speed: 1 + i * 0.1,
      size: 0.02 + i * 0.005,
      color: colors[i % colors.length]
    }));
  }, [trails, count, colors]);
  
  return (
    <group>
      {/* Main particle system */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={particles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aScale"
            count={count}
            array={particles.scales}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aSpeed"
            count={count}
            array={particles.speeds}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aOffset"
            count={count}
            array={particles.offsets}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aType"
            count={count}
            array={particles.types}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aColor"
            count={count}
            array={particles.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <magicalParticleMaterial
          ref={materialRef}
          uniforms-uColor1-value={new THREE.Color(colors[0])}
          uniforms-uColor2-value={new THREE.Color(colors[1])}
          uniforms-uColor3-value={new THREE.Color(colors[2])}
          uniforms-uIntensity-value={intensity}
          uniforms-uSize-value={size}
        />
      </points>
      
      {/* Trail particles */}
      {trails && trailParticles.map((trail) => (
        <Trail
          key={trail.id}
          width={trail.size}
          length={10}
          color={trail.color}
          attenuation={(t) => t * t}
          ref={(el) => (trailsRef.current[trail.id] = el)}
        >
          <mesh>
            <sphereGeometry args={[trail.size * 0.5, 8, 8]} />
            <meshBasicMaterial
              color={trail.color}
              transparent
              opacity={0.8}
            />
          </mesh>
        </Trail>
      ))}
      
      {/* Orbital rings */}
      {orbit && (
        <group>
          {[1, 1.5, 2].map((radius, i) => (
            <mesh
              key={`ring-${i}`}
              rotation={[Math.PI / 2, 0, clock.getElapsedTime() * 0.1 * (i + 1)]}
            >
              <ringGeometry args={[radius, radius + 0.02, 64]} />
              <meshBasicMaterial
                color={colors[i % colors.length]}
                transparent
                opacity={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      )}
      
      {/* Floating text particles */}
      {intensity > 1 && (
        <group>
          {['❤️', '✨', '🌟', '💫', '🔥'].map((emoji, i) => (
            <Float
              key={`emoji-${i}`}
              speed={2}
              rotationIntensity={1}
              floatIntensity={2}
              position={[
                Math.sin(clock.getElapsedTime() + i) * 2,
                Math.cos(clock.getElapsedTime() * 0.7 + i) * 1.5,
                Math.cos(clock.getElapsedTime() + i) * 2
              ]}
            >
              <Text
                fontSize={0.2}
                color="#FFD700"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000"
              >
                {emoji}
              </Text>
            </Float>
          ))}
        </group>
      )}
    </group>
  );
};

// Specialized particle systems for different states
const FrostParticles = (props) => (
  <MagicalParticles
    count={300}
    speed={0.3}
    size={0.03}
    intensity={0.5}
    colors={['#A0D2FF', '#C2E0FF', '#E6F4FF']}
    orbit={false}
    trails={false}
    {...props}
  />
);

const WarmParticles = (props) => (
  <MagicalParticles
    count={400}
    speed={0.4}
    size={0.04}
    intensity={0.8}
    colors={['#FFD700', '#FFA500', '#FF6B00']}
    orbit={true}
    trails={true}
    {...props}
  />
);

const UnlockableParticles = (props) => (
  <MagicalParticles
    count={800}
    speed={0.8}
    size={0.06}
    intensity={1.5}
    colors={['#FFD700', '#FF6B6B', '#6B6BFF', '#00FFAA', '#FF00FF']}
    orbit={true}
    trails={true}
    interactive={true}
    {...props}
  />
);

// Particle Emitter for burst effects
const ParticleEmitter = React.memo(({ 
  position = [0, 0, 0], 
  count = 100,
  size = 0.1,
  color = '#FFD700',
  speed = 2,
  life = 1.0
}) => {
  const particlesRef = useRef();
  const [active, setActive] = useState(true);
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      position: [0, 0, 0],
      velocity: [
        (Math.random() - 0.5) * speed,
        Math.random() * speed,
        (Math.random() - 0.5) * speed
      ],
      life: life,
      size: size * (Math.random() * 0.5 + 0.5)
    }));
    setParticles(newParticles);
    
    const timer = setTimeout(() => setActive(false), life * 1000);
    return () => clearTimeout(timer);
  }, [count, speed, life, size]);
  
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
      
      // Apply gravity
      particle.velocity[1] -= 9.8 * delta * 0.1;
      
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
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={new Float32Array(count * 3)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
});

export default React.memo(MagicalParticles);
export { ParticleEmitter, FrostParticles, WarmParticles, UnlockableParticles };
