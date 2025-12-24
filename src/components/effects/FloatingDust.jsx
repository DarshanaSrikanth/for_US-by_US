import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Points, PointMaterial } from '@react-three/drei';

const FloatingDust = ({ density = 25, speed = 0.1, size = 0.02, color = "#FFD700" }) => {
  const points = useRef();
  const { viewport, mouse } = useThree();
  
  // Generate particle positions
  const particles = useMemo(() => {
    const positions = new Float32Array(density * 3);
    const scales = new Float32Array(density);
    
    for (let i = 0; i < density; i++) {
      // Spherical distribution
      const radius = Math.random() * 4 + 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Random scale for variation
      scales[i] = Math.random() * 0.5 + 0.5;
    }
    
    return { positions, scales };
  }, [density]);

  useFrame((state, delta) => {
    if (points.current) {
      points.current.rotation.y += delta * 0.05;
      points.current.rotation.x += delta * 0.02;
      
      // React to mouse movement
      const time = state.clock.elapsedTime;
      const positions = points.current.geometry.attributes.position.array;
      
      for (let i = 0; i < density; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        
        // Floating motion
        positions[iy] += Math.sin(time + i) * delta * 0.1;
        
        // Gentle sway
        positions[ix] += Math.cos(time * 0.5 + i) * delta * 0.02;
        positions[iz] += Math.sin(time * 0.7 + i) * delta * 0.02;
        
        // Mouse attraction
        const dx = positions[ix] - mouse.x * 2;
        const dy = positions[iy] - mouse.y * 2;
        const dz = positions[iz];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < 2) {
          const force = (2 - distance) * 0.1;
          positions[ix] += dx * force * delta;
          positions[iy] += dy * force * delta;
        }
        
        // Boundary check - keep particles in volume
        const radius = Math.sqrt(
          positions[ix] * positions[ix] + 
          positions[iy] * positions[iy] + 
          positions[iz] * positions[iz]
        );
        
        if (radius > 6) {
          positions[ix] *= 0.95;
          positions[iy] *= 0.95;
          positions[iz] *= 0.95;
        }
      }
      
      points.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <Points ref={points} positions={particles.positions}>
      <PointMaterial
        transparent
        size={size}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={color}
        opacity={0.4}
        alphaTest={0.001}
      />
    </Points>
  );
};

export default React.memo(FloatingDust);