import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { Text, Ring, Sphere, Torus, Cylinder, Line } from '@react-three/drei';
import { EffectComposer, Bloom, Glitch } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';

// Custom shader material for time distortion effects
class TimeDistortionMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uDays: { value: 0 },
        uHours: { value: 0 },
        uMinutes: { value: 0 },
        uColor: { value: new THREE.Color('#FFD700') },
        uIntensity: { value: 1.0 },
        uNoiseScale: { value: 2.0 },
        uDistortion: { value: 0.1 },
        uPulse: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(1, 1) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uDistortion;
        uniform float uPulse;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vPulse;
        
        // Noise functions
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
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          // Time-based distortion
          float timeDistortion = noise(vec2(
            position.x * 0.5 + uTime * 0.3,
            position.y * 0.5 + uTime * 0.2
          )) * uDistortion;
          
          // Progress-based scaling
          float progressScale = 1.0 + uProgress * 0.2;
          
          // Pulse effect
          vPulse = uPulse;
          float pulseDistortion = sin(uTime * 3.0 + position.y * 5.0) * uPulse * 0.1;
          
          vec3 distortedPosition = position * progressScale;
          distortedPosition.x += timeDistortion + pulseDistortion;
          distortedPosition.y += timeDistortion * 0.5;
          
          // Progress-based rotation
          float rotation = uProgress * 3.14159;
          float cosRot = cos(rotation);
          float sinRot = sin(rotation);
          distortedPosition.x = position.x * cosRot - position.z * sinRot;
          distortedPosition.z = position.x * sinRot + position.z * cosRot;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(distortedPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uProgress;
        uniform float uDays;
        uniform float uHours;
        uniform float uMinutes;
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uNoiseScale;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vPulse;
        
        // Complex noise for time texture
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
        
        // Circular gradient
        float circle(vec2 uv, vec2 center, float radius) {
          float d = length(uv - center);
          return smoothstep(radius, radius * 0.8, d);
        }
        
        // Time flow lines
        float timeLines(vec2 uv, float time) {
          float lines = 0.0;
          for (float i = 0.0; i < 5.0; i++) {
            float line = smoothstep(0.01, 0.0, abs(uv.y - sin(uv.x * 3.0 + time + i) * 0.2));
            lines += line * (0.5 + 0.5 * sin(time + i));
          }
          return lines;
        }
        
        void main() {
          // Base color with time-based variation
          vec3 baseColor = uColor * uIntensity;
          
          // Noise-based texture
          float timeNoise = fbm(vUv * uNoiseScale + uTime * 0.1);
          baseColor *= 0.8 + timeNoise * 0.4;
          
          // Progress-based color shift
          float progressColor = sin(uProgress * 3.14159) * 0.3;
          baseColor = mix(baseColor, vec3(1.0, 0.5, 0.0), progressColor);
          
          // Time flow visualization
          float lines = timeLines(vUv, uTime);
          baseColor += lines * 0.3;
          
          // Circular glow
          float glow = circle(vUv, vec2(0.5), 0.4);
          glow = pow(glow, 2.0);
          baseColor += glow * 0.2;
          
          // Pulse effect
          float pulse = sin(uTime * 5.0) * 0.5 + 0.5;
          baseColor *= 1.0 + pulse * vPulse * 0.3;
          
          // Progress-based alpha
          float alpha = 0.8 + uProgress * 0.2;
          alpha *= 0.7 + timeNoise * 0.3;
          
          // Final color
          gl_FragColor = vec4(baseColor, alpha);
          
          // Additive blending
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

extend({ TimeDistortionMaterial });

// Clock hands component
const ClockHands = ({ days, hours, minutes, progress = 0 }) => {
  const handsRef = useRef();
  const [timeRatio, setTimeRatio] = useState(0);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (handsRef.current) {
      // Calculate time ratios
      const totalMinutes = days * 24 * 60 + hours * 60 + minutes;
      const remainingRatio = totalMinutes > 0 ? (days * 24 * 60 + hours * 60 + minutes) / (7 * 24 * 60) : 0;
      
      setTimeRatio(remainingRatio);
      
      // Animate hands based on time
      const dayRotation = (1.0 - remainingRatio) * Math.PI * 2;
      const hourRotation = time * 0.1;
      const minuteRotation = time * 0.5;
      
      handsRef.current.children[0].rotation.z = -dayRotation; // Days hand
      handsRef.current.children[1].rotation.z = -hourRotation; // Hours hand
      handsRef.current.children[2].rotation.z = -minuteRotation; // Minutes hand
      
      // Progress-based scaling
      const scale = 1.0 + Math.sin(time) * 0.05 * progress;
      handsRef.current.scale.setScalar(scale);
    }
  });
  
  // Calculate hand colors based on time urgency
  const getHandColor = (value, max) => {
    const ratio = value / max;
    if (ratio > 0.5) return '#4CAF50'; // Green - plenty of time
    if (ratio > 0.2) return '#FFD700'; // Yellow - moderate time
    return '#FF6B6B'; // Red - urgent
  };
  
  return (
    <group ref={handsRef}>
      {/* Days hand (longest) */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[0.02, 0.8, 0.02]} />
        <meshStandardMaterial
          color={getHandColor(days, 7)}
          emissive={getHandColor(days, 7)}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Hours hand (medium) */}
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[0.02, 0.6, 0.02]} />
        <meshStandardMaterial
          color={getHandColor(hours, 24)}
          emissive={getHandColor(hours, 24)}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Minutes hand (shortest) */}
      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[0.02, 0.4, 0.02]} />
        <meshStandardMaterial
          color={getHandColor(minutes, 60)}
          emissive={getHandColor(minutes, 60)}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Center hub */}
      <mesh position={[0, 0, 0.13]}>
        <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
};

// Time orb particle system
const TimeOrbs = ({ count = 50, speed = 1.0, intensity = 1.0 }) => {
  const pointsRef = useRef();
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speeds = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const radius = 1.5 + Math.random() * 1.0;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 2;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      scales[i] = 0.05 + Math.random() * 0.1;
      speeds[i] = 0.5 + Math.random() * 0.5;
    }
    
    return { positions, scales, speeds };
  }, [count]);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array;
      const scales = pointsRef.current.geometry.attributes.aScale.array;
      
      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        
        // Orbital motion
        const radius = Math.sqrt(
          positions[ix] * positions[ix] + 
          positions[iz] * positions[iz]
        );
        
        const angle = Math.atan2(positions[iz], positions[ix]) + time * 0.1 * particles.speeds[i];
        
        positions[ix] = Math.cos(angle) * radius;
        positions[iz] = Math.sin(angle) * radius;
        
        // Vertical float
        positions[iy] += Math.sin(time * particles.speeds[i] + i) * 0.01;
        
        // Pulsing scale
        scales[i] = particles.scales[i] * (1.0 + Math.sin(time * 2 + i) * 0.2) * intensity;
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
      pointsRef.current.geometry.attributes.aScale.needsUpdate = true;
    }
  });
  
  return (
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
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#FFD700"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

// Main TimeDisplay component
const TimeDisplay = ({ 
  days = 2,
  hours = 4,
  minutes = 30,
  seconds = 0,
  position = [0, 3, 0],
  size = 1.0,
  intensity = 1.0,
  withClock = true,
  withOrbs = true,
  withEffects = true,
  onComplete
}) => {
  const containerRef = useRef();
  const materialRef = useRef();
  const [progress, setProgress] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState({ days, hours, minutes, seconds });
  const [isUrgent, setIsUrgent] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  
  const { clock } = useThree();
  
  // Calculate total seconds and progress
  const totalSeconds = useMemo(() => {
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }, [days, hours, minutes, seconds]);
  
  // Countdown timer
  useEffect(() => {
    let remaining = totalSeconds;
    const interval = setInterval(() => {
      if (remaining <= 0) {
        clearInterval(interval);
        if (onComplete) onComplete();
        return;
      }
      
      remaining--;
      
      const newDays = Math.floor(remaining / 86400);
      const newHours = Math.floor((remaining % 86400) / 3600);
      const newMinutes = Math.floor((remaining % 3600) / 60);
      const newSeconds = remaining % 60;
      
      setTimeRemaining({
        days: newDays,
        hours: newHours,
        minutes: newMinutes,
        seconds: newSeconds
      });
      
      // Calculate progress (0 to 1)
      const newProgress = 1 - (remaining / totalSeconds);
      setProgress(newProgress);
      
      // Urgency states
      setIsUrgent(remaining < 3600); // Less than 1 hour
      setIsCritical(remaining < 300); // Less than 5 minutes
      
      // Pulse effect based on urgency
      if (remaining < 300) {
        setPulse(1.0);
      } else if (remaining < 3600) {
        setPulse(0.5);
      } else {
        setPulse(0.1);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [totalSeconds, onComplete]);
  
  // Animation frame
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uProgress.value = progress;
      materialRef.current.uniforms.uDays.value = timeRemaining.days;
      materialRef.current.uniforms.uHours.value = timeRemaining.hours;
      materialRef.current.uniforms.uMinutes.value = timeRemaining.minutes;
      materialRef.current.uniforms.uPulse.value = pulse;
    }
    
    // Container animation
    if (containerRef.current) {
      // Gentle floating
      containerRef.current.position.y = position[1] + Math.sin(time) * 0.1;
      
      // Urgent rotation
      if (isUrgent) {
        containerRef.current.rotation.y = time * 0.5;
      } else {
        containerRef.current.rotation.y = time * 0.1;
      }
      
      // Critical scaling
      if (isCritical) {
        const criticalScale = 1.0 + Math.sin(time * 5) * 0.1;
        containerRef.current.scale.setScalar(size * criticalScale);
      } else {
        containerRef.current.scale.setScalar(size);
      }
    }
  });
  
  // Format time for display
  const formatTime = () => {
    if (timeRemaining.days > 0) {
      return `${timeRemaining.days}d ${timeRemaining.hours}h`;
    } else if (timeRemaining.hours > 0) {
      return `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
    } else {
      return `${timeRemaining.minutes}m ${timeRemaining.seconds}s`;
    }
  };
  
  // Get color based on urgency
  const getTimeColor = () => {
    if (isCritical) return '#FF6B6B';
    if (isUrgent) return '#FFA500';
    return '#FFD700';
  };
  
  // Get effects intensity based on urgency
  const getEffectsIntensity = () => {
    if (isCritical) return intensity * 2.0;
    if (isUrgent) return intensity * 1.5;
    return intensity;
  };
  
  return (
    <group ref={containerRef} position={position}>
      {/* Main time ring */}
      <Ring args={[1.2, 1.5, 64]} rotation={[Math.PI / 2, 0, 0]}>
        <timeDistortionMaterial
          ref={materialRef}
          uniforms-uColor-value={new THREE.Color(getTimeColor())}
          uniforms-uIntensity-value={getEffectsIntensity()}
        />
      </Ring>
      
      {/* Progress ring */}
      <Ring args={[1.1, 1.2, 64]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          color={getTimeColor()}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </Ring>
      
      {/* Clock face */}
      {withClock && (
        <group position={[0, 0.1, 0]}>
          {/* Clock face */}
          <Ring args={[0.8, 1.0, 64]} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial
              color="#1a1f2e"
              emissive="#1a1f2e"
              emissiveIntensity={0.1}
              side={THREE.DoubleSide}
            />
          </Ring>
          
          {/* Hour markers */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const x = Math.cos(angle) * 0.9;
            const z = Math.sin(angle) * 0.9;
            return (
              <mesh key={i} position={[x, 0.11, z]}>
                <boxGeometry args={[0.05, 0.02, 0.05]} />
                <meshStandardMaterial
                  color="#FFD700"
                  emissive="#FFD700"
                  emissiveIntensity={0.3}
                />
              </mesh>
            );
          })}
          
          {/* Clock hands */}
          <ClockHands
            days={timeRemaining.days}
            hours={timeRemaining.hours}
            minutes={timeRemaining.minutes}
            progress={progress}
          />
        </group>
      )}
      
      {/* Time orbs */}
      {withOrbs && (
        <TimeOrbs
          count={isCritical ? 100 : isUrgent ? 75 : 50}
          speed={isCritical ? 2.0 : isUrgent ? 1.5 : 1.0}
          intensity={getEffectsIntensity()}
        />
      )}
      
      {/* Digital time display */}
      <Text
        position={[0, -1.5, 0]}
        fontSize={0.4}
        color={getTimeColor()}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000"
        font="/fonts/JetBrainsMono-Bold.ttf"
      >
        {formatTime()}
      </Text>
      
      {/* Progress indicator */}
      <Text
        position={[0, -2.0, 0]}
        fontSize={0.2}
        color={getTimeColor()}
        anchorX="center"
        anchorY="middle"
        opacity={0.7}
      >
        {`${Math.round(progress * 100)}% Complete`}
      </Text>
      
      {/* Effects */}
      {withEffects && (
        <>
          <EffectComposer>
            <Bloom
              intensity={getEffectsIntensity() * 0.5}
              luminanceThreshold={0.6}
              luminanceSmoothing={0.1}
            />
            
            {isCritical && (
              <Glitch
                delay={[0.5, 1.0]}
                duration={[0.1, 0.3]}
                strength={[0.2, 0.4]}
                mode={GlitchMode.CONSTANT_MILD}
                active
              />
            )}
          </EffectComposer>
          
          {/* Urgency indicators */}
          {isUrgent && (
            <group>
              {/* Warning rings */}
              <Ring
                args={[1.6, 1.7, 32]}
                rotation={[Math.PI / 2, 0, clock.getElapsedTime()]}
              >
                <meshBasicMaterial
                  color="#FF6B6B"
                  transparent
                  opacity={0.3}
                  side={THREE.DoubleSide}
                />
              </Ring>
              
              {/* Warning text */}
              <Text
                position={[0, 2.0, 0]}
                fontSize={0.3}
                color="#FF6B6B"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="#000"
              >
                {isCritical ? 'CRITICAL' : 'URGENT'}
              </Text>
            </group>
          )}
        </>
      )}
      
      {/* Time flow lines */}
      <TimeFlowLines count={20} intensity={getEffectsIntensity()} />
    </group>
  );
};

// Time flow visualization lines
const TimeFlowLines = ({ count = 20, intensity = 1.0 }) => {
  const linesRef = useRef([]);
  
  const lines = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      start: [
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      ],
      end: [
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      ],
      speed: 0.5 + Math.random() * 1.0,
      color: ['#FFD700', '#FF6B6B', '#6B6BFF'][Math.floor(Math.random() * 3)]
    }));
  }, [count]);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    linesRef.current.forEach((line, i) => {
      if (line) {
        const speed = lines[i].speed;
        line.position.y = Math.sin(time * speed + i) * 0.1;
        line.rotation.y = time * speed * 0.1;
        
        // Pulsing opacity
        const opacity = 0.3 + Math.sin(time * speed * 2 + i) * 0.2;
        if (line.material) {
          line.material.opacity = opacity * intensity;
        }
      }
    });
  });
  
  return (
    <group>
      {lines.map((line) => (
        <Line
          key={line.id}
          ref={(el) => (linesRef.current[line.id] = el)}
          points={[line.start, line.end]}
          color={line.color}
          lineWidth={2}
          transparent
          opacity={0.3}
        />
      ))}
    </group>
  );
};

// TimeDisplay variants for different states
export const StateCTimeDisplay = (props) => (
  <TimeDisplay
    size={1.2}
    intensity={1.5}
    withClock={true}
    withOrbs={true}
    withEffects={true}
    {...props}
  />
);

export const UrgentTimeDisplay = (props) => (
  <TimeDisplay
    size={1.5}
    intensity={2.0}
    withClock={false}
    withOrbs={true}
    withEffects={true}
    {...props}
  />
);

export const MinimalTimeDisplay = (props) => (
  <TimeDisplay
    size={0.8}
    intensity={0.8}
    withClock={false}
    withOrbs={false}
    withEffects={false}
    {...props}
  />
);

export default TimeDisplay;