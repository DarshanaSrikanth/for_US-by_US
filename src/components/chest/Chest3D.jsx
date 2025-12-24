import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { 
  MeshReflectorMaterial, 
  MeshRefractionMaterial,
  useTexture,
  Environment,
  Float,
  MeshDistortMaterial,
  MeshWobbleMaterial,
  MeshTransmissionMaterial,
  Lightformer,
  Text
} from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { suspend } from 'suspend-react';

extend({ MeshWobbleMaterial, MeshDistortMaterial, MeshTransmissionMaterial });

// Preload HDR environment
const preloadHDR = () => {
  const loader = new RGBELoader();
  return loader.loadAsync('/environments/moonlit_golden_room_1k.hdr');
};

// Chest materials and textures
const CHEST_MATERIALS = {
  wood: {
    color: '#8B4513',
    roughness: 0.8,
    metalness: 0.1,
    normalScale: [0.3, 0.3]
  },
  brass: {
    color: '#B8860B',
    roughness: 0.3,
    metalness: 0.9,
    emissive: '#FFD700',
    emissiveIntensity: 0.1
  },
  gold: {
    color: '#FFD700',
    roughness: 0.2,
    metalness: 1.0,
    envMapIntensity: 2
  },
  frost: {
    color: '#E6F4FF',
    roughness: 0.5,
    metalness: 0.3,
    transparent: true,
    opacity: 0.8
  }
};

// Decorative engravings
const ENGRAVINGS = [
  '❤️', '✨', '🌀', '🌟', '🌙', '⭐', '💫', '🔥',
  '𓂀', '𓃠', '𓆙', '𓇋', '𓊝', '𓍯', '𓎡', '𓏏'
];

// Advanced Chest Geometry Component
const ChestGeometry = React.memo(({ state, isHovering, isOpening }) => {
  const meshRef = useRef();
  const lidRef = useRef();
  const lockRef = useRef();
  const hingesRef = useRef([]);
  const engravingsRef = useRef([]);
  const innerLightRef = useRef();
  
  const { clock } = useThree();
  const [hoverIntensity, setHoverIntensity] = useState(0);
  const [openProgress, setOpenProgress] = useState(0);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0);
  const [timeGlow, setTimeGlow] = useState(0);
  
  // Texture loading
  const [woodTexture, brassTexture, normalMap] = useTexture([
    '/textures/wood_aged_diffuse.jpg',
    '/textures/brass_worn_diffuse.jpg',
    '/textures/wood_normal.jpg'
  ]);
  
  // Set texture parameters
  useEffect(() => {
    if (woodTexture) {
      woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
      woodTexture.repeat.set(2, 1);
    }
    if (brassTexture) {
      brassTexture.wrapS = brassTexture.wrapT = THREE.RepeatWrapping;
      brassTexture.repeat.set(4, 4);
    }
  }, [woodTexture, brassTexture]);

  // Animation frame updates
  useFrame((state, delta) => {
    const time = clock.getElapsedTime();
    
    // Hover intensity interpolation
    setHoverIntensity(prev => THREE.MathUtils.lerp(prev, isHovering ? 1 : 0, delta * 8));
    
    // Opening animation
    if (isOpening) {
      setOpenProgress(prev => Math.min(prev + delta * 0.8, 1));
    } else {
      setOpenProgress(prev => Math.max(prev - delta * 2, 0));
    }
    
    // Breathing animation
    setBreathPhase(time * 0.5);
    const breath = Math.sin(breathPhase) * 0.5 + 0.5;
    
    // Time-based pulse for locked state
    if (state.includes('locked')) {
      setPulsePhase(time * (state === 'locked-pulsing' ? 1 : 0.3));
      const pulse = Math.sin(pulsePhase) * 0.5 + 0.5;
      setTimeGlow(pulse);
    } else {
      setTimeGlow(breath);
    }
    
    // Apply animations to refs
    if (lidRef.current) {
      lidRef.current.rotation.x = THREE.MathUtils.lerp(
        lidRef.current.rotation.x,
        -Math.PI / 2 * openProgress,
        delta * 8
      );
      
      // Add subtle hover wobble
      if (isHovering && !isOpening) {
        lidRef.current.rotation.z = Math.sin(time * 4) * 0.02 * hoverIntensity;
      }
    }
    
    if (lockRef.current) {
      // Lock rotation and scale based on state
      const lockScale = state === 'unlockable' ? 1.2 : 1;
      lockRef.current.scale.lerp(
        new THREE.Vector3(lockScale, lockScale, lockScale),
        delta * 6
      );
      
      // Glow intensity
      const lockIntensity = state === 'unlockable' ? 2 : timeGlow * 0.5;
      if (lockRef.current.material) {
        lockRef.current.material.emissiveIntensity = lockIntensity;
      }
    }
    
    // Hinges animation
    hingesRef.current.forEach((hinge, index) => {
      if (hinge) {
        const hingeBreath = Math.sin(time * 2 + index) * 0.05 + 0.95;
        hinge.scale.lerp(new THREE.Vector3(hingeBreath, hingeBreath, hingeBreath), delta * 4);
      }
    });
    
    // Engravings floating animation
    engravingsRef.current.forEach((engraving, index) => {
      if (engraving) {
        const floatSpeed = 1 + index * 0.2;
        const floatAmount = 0.05;
        engraving.position.y = Math.sin(time * floatSpeed + index) * floatAmount;
        engraving.rotation.y = time * 0.5 + index;
        
        // Alpha pulsing
        if (engraving.material) {
          engraving.material.opacity = 0.3 + Math.sin(time * 2 + index) * 0.2;
        }
      }
    });
    
    // Inner light animation
    if (innerLightRef.current) {
      const intensity = state === 'unlockable' ? 5 : 
                       state === 'locked-pulsing' ? 2 + timeGlow * 2 : 
                       state === 'closed-warm' ? 1 + breath * 0.5 : 0.1;
      
      innerLightRef.current.intensity = intensity;
      
      // Color based on state
      let color;
      switch(state) {
        case 'locked-frost': color = new THREE.Color('#E6F4FF'); break;
        case 'unlockable': color = new THREE.Color('#FFD700'); break;
        default: color = new THREE.Color('#FFA500');
      }
      innerLightRef.current.color.lerp(color, delta * 4);
    }
    
    // Chest container subtle floating
    if (meshRef.current) {
      const floatY = Math.sin(time * 0.5) * 0.02;
      const rotateY = time * 0.05;
      meshRef.current.position.y = floatY;
      meshRef.current.rotation.y = rotateY;
      
      // Hover tilt
      if (isHovering && !isOpening) {
        meshRef.current.rotation.x = hoverIntensity * 0.1;
        meshRef.current.rotation.z = hoverIntensity * -0.05;
      }
    }
  });

  // Get material based on state
  const getMaterials = useCallback(() => {
    const baseMaterials = {
      wood: CHEST_MATERIALS.wood,
      brass: CHEST_MATERIALS.brass
    };
    
    switch(state) {
      case 'locked-frost':
        return {
          wood: { ...baseMaterials.wood, ...CHEST_MATERIALS.frost },
          brass: { ...baseMaterials.brass, color: '#A0A0A0', emissiveIntensity: 0 }
        };
        
      case 'locked-pulsing':
        return {
          wood: baseMaterials.wood,
          brass: { 
            ...baseMaterials.brass, 
            emissiveIntensity: 0.5 + timeGlow * 0.5,
            emissive: '#FF6B6B'
          }
        };
        
      case 'unlockable':
        return {
          wood: { ...baseMaterials.wood, emissive: '#4A3C00', emissiveIntensity: 0.3 },
          brass: { 
            ...baseMaterials.brass, 
            color: '#FFE55C',
            emissive: '#FFE55C',
            emissiveIntensity: 1.5,
            roughness: 0.1
          }
        };
        
      default:
        return baseMaterials;
    }
  }, [state, timeGlow]);

  // Generate random engravings
  const engravings = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      char: ENGRAVINGS[Math.floor(Math.random() * ENGRAVINGS.length)],
      position: [
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 0.6 + 0.3,
        Math.random() > 0.5 ? 0.501 : -0.501
      ],
      rotation: [0, Math.random() * Math.PI, 0]
    }));
  }, []);

  const materials = getMaterials();

  return (
    <group ref={meshRef}>
      {/* Main chest body */}
      <mesh castShadow receiveShadow position={[0, -0.2, 0]}>
        <boxGeometry args={[1, 0.6, 0.6]} />
        <meshStandardMaterial
          {...materials.wood}
          map={woodTexture}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.3, 0.3)}
        />
      </mesh>

      {/* Chest lid */}
      <mesh 
        ref={lidRef} 
        castShadow 
        receiveShadow 
        position={[0, 0.1, 0]}
      >
        <boxGeometry args={[1.02, 0.05, 0.62]} />
        <meshStandardMaterial
          {...materials.wood}
          map={woodTexture}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.3, 0.3)}
        />
      </mesh>

      {/* Brass edges and corners */}
      <mesh castShadow position={[0, -0.2, 0.3]}>
        <boxGeometry args={[1.1, 0.65, 0.05]} />
        <meshStandardMaterial {...materials.brass} map={brassTexture} />
      </mesh>
      <mesh castShadow position={[0, -0.2, -0.3]}>
        <boxGeometry args={[1.1, 0.65, 0.05]} />
        <meshStandardMaterial {...materials.brass} map={brassTexture} />
      </mesh>
      <mesh castShadow position={[0.5, -0.2, 0]}>
        <boxGeometry args={[0.05, 0.65, 0.62]} />
        <meshStandardMaterial {...materials.brass} map={brassTexture} />
      </mesh>
      <mesh castShadow position={[-0.5, -0.2, 0]}>
        <boxGeometry args={[0.05, 0.65, 0.62]} />
        <meshStandardMaterial {...materials.brass} map={brassTexture} />
      </mesh>

      {/* Decorative engravings */}
      {engravings.map((engraving) => (
        <mesh
          key={engraving.id}
          ref={el => engravingsRef.current[engraving.id] = el}
          position={engraving.position}
          rotation={engraving.rotation}
        >
          <planeGeometry args={[0.15, 0.15]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
          {/* Emissive text */}
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.1}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
          >
            {engraving.char}
          </Text>
        </mesh>
      ))}

      {/* Hinges */}
      {[0.3, -0.3].map((zPos, i) => (
        <mesh
          key={`hinge-${i}`}
          ref={el => hingesRef.current[i] = el}
          castShadow
          position={[-0.45, 0.1, zPos]}
        >
          <cylinderGeometry args={[0.03, 0.03, 0.1]} />
          <meshStandardMaterial {...materials.brass} map={brassTexture} />
        </mesh>
      ))}

      {/* Lock mechanism */}
      <mesh 
        ref={lockRef} 
        castShadow 
        position={[0.45, 0.05, 0]}
      >
        <boxGeometry args={[0.1, 0.15, 0.05]} />
        <meshStandardMaterial
          {...materials.brass}
          map={brassTexture}
          emissive={materials.brass.emissive}
          emissiveIntensity={materials.brass.emissiveIntensity || 0}
        />
        {/* Lock keyhole */}
        <mesh position={[0, 0, 0.026]}>
          <circleGeometry args={[0.02, 8]} />
          <meshBasicMaterial color="#000" />
        </mesh>
        {/* Animated lock runes */}
        {state === 'locked-pulsing' && (
          <group position={[0, 0.2, 0]}>
            {['𓂀', '𓆙', '𓇋'].map((rune, i) => (
              <Float key={i} speed={2} rotationIntensity={1} floatIntensity={1}>
                <Text
                  position={[0, i * 0.15, 0]}
                  fontSize={0.08}
                  color="#FF6B6B"
                  anchorX="center"
                  anchorY="middle"
                >
                  {rune}
                </Text>
              </Float>
            ))}
          </group>
        )}
      </mesh>

      {/* Inner glow light */}
      <pointLight
        ref={innerLightRef}
        position={[0, 0, 0]}
        distance={3}
        decay={2}
        castShadow
      />

      {/* Inner chest contents glow */}
      {state !== 'locked-frost' && (
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.9, 0.4, 0.5]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Frost effect particles */}
      {state === 'locked-frost' && (
        <group>
          {Array.from({ length: 50 }).map((_, i) => (
            <mesh
              key={`frost-${i}`}
              position={[
                (Math.random() - 0.5) * 1.5,
                Math.random() * 1,
                (Math.random() - 0.5) * 1.5
              ]}
            >
              <sphereGeometry args={[0.01 + Math.random() * 0.02, 4, 4]} />
              <meshPhysicalMaterial
                color="#E6F4FF"
                transparent
                opacity={0.3 + Math.random() * 0.3}
                transmission={0.8}
                roughness={0.1}
                ior={1.33}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Unlockable state particles */}
      {state === 'unlockable' && (
        <group>
          {Array.from({ length: 30 }).map((_, i) => (
            <Float key={`magic-${i}`} speed={2} rotationIntensity={2} floatIntensity={2}>
              <mesh
                position={[
                  (Math.random() - 0.5) * 2,
                  Math.random() * 2,
                  (Math.random() - 0.5) * 2
                ]}
              >
                <icosahedronGeometry args={[0.03, 1]} />
                <meshStandardMaterial
                  color="#FFD700"
                  emissive="#FFD700"
                  emissiveIntensity={2}
                />
              </mesh>
            </Float>
          ))}
        </group>
      )}

      {/* Opening effect - golden particles */}
      {isOpening && openProgress > 0 && (
        <group>
          {Array.from({ length: Math.floor(openProgress * 50) }).map((_, i) => {
            const angle = (i / 25) * Math.PI * 2;
            const radius = openProgress * 0.5;
            return (
              <mesh
                key={`open-particle-${i}`}
                position={[
                  Math.cos(angle) * radius,
                  openProgress * 0.5 + Math.random() * 0.3,
                  Math.sin(angle) * radius
                ]}
              >
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshStandardMaterial
                  color="#FFD700"
                  emissive="#FFD700"
                  emissiveIntensity={3}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
});

// Scene Environment
const SceneEnvironment = () => {
  const envMap = suspend(preloadHDR, []);
  
  return (
    <>
      <Environment map={envMap} background blur={0.5} />
      
      {/* Custom light setup */}
      <ambientLight intensity={0.3} color="#FFEECC" />
      
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        color="#FFEECC"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      <directionalLight
        position={[-5, 3, -5]}
        intensity={0.5}
        color="#CCEEFF"
        castShadow
      />
      
      {/* Accent lights */}
      <pointLight position={[0, 3, 0]} intensity={0.2} color="#FFD700" />
      <pointLight position={[2, 1, 2]} intensity={0.3} color="#FF6B6B" />
      <pointLight position={[-2, 1, -2]} intensity={0.3} color="#6B6BFF" />
      
      {/* Floor reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          depthScale={1}
          minDepthThreshold={0.9}
          maxDepthThreshold={1}
          color="#202020"
          metalness={0.8}
          roughness={1}
        />
      </mesh>
      
      {/* Floating particles in background */}
      {Array.from({ length: 100 }).map((_, i) => (
        <mesh
          key={`bg-particle-${i}`}
          position={[
            (Math.random() - 0.5) * 20,
            Math.random() * 10,
            (Math.random() - 0.5) * 20 - 5
          ]}
        >
          <sphereGeometry args={[0.02 + Math.random() * 0.03, 4, 4]} />
          <meshBasicMaterial
            color={['#FFD700', '#FF6B6B', '#6B6BFF'][Math.floor(Math.random() * 3)]}
            transparent
            opacity={0.1 + Math.random() * 0.2}
          />
        </mesh>
      ))}
    </>
  );
};

// Post-processing effects
const PostProcessing = ({ state }) => {
  const { gl, size } = useThree();
  
  return (
    <EffectComposer multisampling={8} stencilBuffer>
      <Bloom
        intensity={state === 'unlockable' ? 1.5 : 0.8}
        kernelSize={KernelSize.LARGE}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.1}
      />
      
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={state === 'unlockable' ? [0.002, 0.002] : [0.001, 0.001]}
        radialModulation={state === 'unlockable'}
        modulationOffset={0.5}
      />
      
      <Vignette
        darkness={0.5}
        offset={0.4}
        eskil={false}
        blendFunction={BlendFunction.NORMAL}
      />
      
      <DepthOfField
        focusDistance={0.02}
        focalLength={0.05}
        bokehScale={state === 'unlockable' ? 4 : 2}
      />
    </EffectComposer>
  );
};

// Main Chest3D Component
const Chest3D = ({ 
  state = 'closed-warm', 
  isHovering = false, 
  isOpening = false,
  unlockTime = null
}) => {
  const canvasRef = useRef();
  const [timeRemaining, setTimeRemaining] = useState('');
  
  // Calculate time remaining for locked state
  useEffect(() => {
    if (unlockTime && state === 'locked-pulsing') {
      const interval = setInterval(() => {
        const now = new Date();
        const unlock = new Date(unlockTime);
        const diff = unlock - now;
        
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
        } else {
          setTimeRemaining('Ready!');
        }
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [unlockTime, state]);

  // Performance optimization - reduce quality on mobile
  const isMobile = useMemo(() => {
    return window.innerWidth < 768;
  }, []);

  const dpr = isMobile ? 1 : 2;
  const shadows = !isMobile;

  return (
    <>
    {/* Remove Canvas wrapper, keep just the children */}
    <color attach="background" args={['#0b0f1a']} />
    <fog attach="fog" args={['#0b0f1a', 5, 15]} />
    
    <SceneEnvironment />
    
    <Suspense fallback={null}>
      <ChestGeometry 
        state={state} 
        isHovering={isHovering} 
        isOpening={isOpening} 
      />
          
          {/* Time display in 3D space */}
          {state === 'locked-pulsing' && timeRemaining && (
            <group position={[0, 1.5, 0]}>
              <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                <Text
                  fontSize={0.15}
                  color="#FFD700"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.02}
                  outlineColor="#000"
                >
                  {timeRemaining}
                </Text>
              </Float>
              
              {/* Circular progress indicator */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
                <ringGeometry args={[0.5, 0.55, 64]} />
                <meshBasicMaterial
                  color="#FFD700"
                  transparent
                  opacity={0.3}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          )}
          
          {/* State indicator text */}
          {state === 'locked-frost' && (
            <group position={[0, -1.5, 0]}>
              <Text
                fontSize={0.1}
                color="#A0D2FF"
                anchorX="center"
                anchorY="middle"
                font="/fonts/CormorantGaramond-Regular.ttf"
              >
                Waiting for partner...
              </Text>
            </group>
          )}
          
          {state === 'unlockable' && (
            <group position={[0, 1.8, 0]}>
              <Float speed={3} rotationIntensity={2} floatIntensity={2}>
                <Text
                  fontSize={0.2}
                  color="#FFD700"
                  anchorX="center"
                  anchorY="middle"
                  font="/fonts/CormorantGaramond-Bold.ttf"
                >
                  READY
                </Text>
              </Float>
            </group>
          )}
          
          {/* Interactive glow orb */}
          {isHovering && !isOpening && (
            <mesh position={[0, 2, 0]}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <MeshDistortMaterial
                color="#FFD700"
                emissive="#FFD700"
                emissiveIntensity={2}
                distort={0.4}
                speed={2}
                roughness={0.1}
              />
            </mesh>
          )}
          
          <PostProcessing state={state} />
        </Suspense>
        
        {/* Performance stats (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <PerformanceMonitor />
        )}
      
      {/* Loading overlay */}
      <div className="chest-loading-overlay">
        <div className="chest-loading-text">
          Loading chest experience...
        </div>
      </div>
    </>
  );
};

// Performance monitor component
const PerformanceMonitor = () => {
  const { gl } = useThree();
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const currentTime = performance.now();
    
    if (currentTime - lastTime.current >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)));
      frameCount.current = 0;
      lastTime.current = currentTime;
      
      // Get memory info if available
      if (performance.memory) {
        setMemory(Math.round(performance.memory.usedJSHeapSize / 1024 / 1024));
      }
    }
  });

  return (
    <group position={[-2.5, 1.8, -3]}>
      <Text fontSize={0.08} color={fps < 30 ? '#FF6B6B' : '#90EE90'}>
        {fps} FPS
      </Text>
      {memory > 0 && (
        <Text fontSize={0.06} color="#A0A0A0" position={[0, -0.12, 0]}>
          {memory} MB
        </Text>
      )}
    </group>
  );
};

// Error boundary for 3D context
class ChestErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chest3D Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chest-error-fallback">
          <div className="error-message">
            The chest couldn't be loaded. Please refresh the page.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export wrapped component
const WrappedChest3D = (props) => (
  <ChestErrorBoundary>
    <Chest3D {...props} />
  </ChestErrorBoundary>
);

export default React.memo(WrappedChest3D);