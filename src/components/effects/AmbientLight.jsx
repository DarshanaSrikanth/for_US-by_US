import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { Lightformer, Environment, Sky } from '@react-three/drei';

// Custom volumetric light material
class VolumetricLightMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 1.0 },
        uColor: { value: new THREE.Color('#FFD700') },
        uNoiseScale: { value: 2.0 },
        uDensity: { value: 0.8 },
        uDecay: { value: 0.95 },
        uWeight: { value: 0.4 },
        uSamples: { value: 100 },
        uExposure: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;
        uniform float uNoiseScale;
        uniform float uDensity;
        uniform float uDecay;
        uniform float uWeight;
        uniform int uSamples;
        uniform float uExposure;
        
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        
        // Simplex noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) { 
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i); 
          vec4 p = permute(permute(permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
        }
        
        // Fractional Brownian Motion
        float fbm(vec3 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for (int i = 0; i < 5; i++) {
            value += amplitude * snoise(p * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
          }
          return value;
        }
        
        // Volumetric light scattering
        float volumetricLight(vec3 rayOrigin, vec3 rayDirection, float rayLength) {
          float stepSize = rayLength / float(uSamples);
          vec3 step = rayDirection * stepSize;
          
          float density = 0.0;
          float weight = uWeight;
          float decay = uDecay;
          float illuminationDecay = 1.0;
          vec3 samplePoint = rayOrigin;
          
          for (int i = 0; i < uSamples; i++) {
            float noise = fbm(samplePoint * uNoiseScale + uTime * 0.1);
            density += noise * illuminationDecay * weight;
            illuminationDecay *= decay;
            samplePoint += step;
          }
          
          return density * uDensity;
        }
        
        void main() {
          // Ray from camera to fragment
          vec3 rayOrigin = cameraPosition;
          vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
          float rayLength = length(vWorldPosition - cameraPosition);
          
          // Calculate volumetric light density
          float density = volumetricLight(rayOrigin, rayDirection, rayLength);
          
          // Apply color and intensity
          vec3 lightColor = uColor * uIntensity * density * uExposure;
          
          // Add noise-based shimmer
          float shimmer = sin(uTime * 2.0 + vWorldPosition.x * 3.0) * 0.1 + 0.9;
          lightColor *= shimmer;
          
          // Soft falloff based on distance from center
          float centerDistance = length(vWorldPosition);
          float falloff = 1.0 - smoothstep(0.0, 10.0, centerDistance);
          
          // Final color with alpha
          vec4 finalColor = vec4(lightColor * falloff, density * 0.3);
          
          gl_FragColor = finalColor;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
  }
}

extend({ VolumetricLightMaterial });

// Volumetric Light Component
const VolumetricLight = React.forwardRef(({ 
  intensity = 1.0, 
  color = '#FFD700', 
  position = [0, 0, 0],
  scale = [10, 10, 10]
}, ref) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const { clock } = useThree();
  
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.uIntensity.value = intensity;
    }
  });
  
  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <volumetricLightMaterial 
        ref={materialRef}
        uniforms-uColor-value={new THREE.Color(color)}
      />
    </mesh>
  );
});

// Dynamic Lightformer Grid
const LightformerGrid = ({ count = 16, intensity = 0.5 }) => {
  const groupRef = useRef();
  const [lights, setLights] = useState([]);
  
  useEffect(() => {
    const newLights = [];
    for (let i = 0; i < count; i++) {
      newLights.push({
        id: i,
        position: [
          (Math.random() - 0.5) * 20,
          Math.random() * 10,
          (Math.random() - 0.5) * 20 - 5
        ],
        scale: Math.random() * 2 + 1,
        color: ['#FFD700', '#FF6B6B', '#6B6BFF'][Math.floor(Math.random() * 3)],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0]
      });
    }
    setLights(newLights);
  }, [count]);
  
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.children.forEach((light, i) => {
        const t = time * 0.5 + i;
        light.position.y += Math.sin(t) * 0.01;
        light.rotation.z = Math.sin(t * 0.7) * 0.1;
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      {lights.map((light) => (
        <Lightformer
          key={light.id}
          form="circle"
          intensity={intensity}
          position={light.position}
          rotation={light.rotation}
          scale={light.scale}
          color={light.color}
          onUpdate={(self) => (self.lookAt(0, 0, 0))}
        />
      ))}
    </group>
  );
};

// Main AmbientLight Component
const AmbientLight = ({ 
  intensity = 0.3, 
  color = 'rgba(255, 215, 0, 0.1)',
  state = 'default',
  enableVolumetric = true,
  enableBloom = true,
  enableGodRays = false
}) => {
  const { scene, gl, camera, size } = useThree();
  const [lightConfig, setLightConfig] = useState({
    volumetricIntensity: 0.5,
    bloomIntensity: 0.8,
    exposure: 1.0
  });
  
  const renderTarget = useMemo(() => {
    const pixelRatio = gl.getPixelRatio();
    return new THREE.WebGLRenderTarget(
      size.width * pixelRatio,
      size.height * pixelRatio,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        encoding: gl.outputEncoding,
        samples: 4
      }
    );
  }, [gl, size]);
  
  // State-based lighting configurations
  useEffect(() => {
    switch(state) {
      case 'locked-frost':
        setLightConfig({
          volumetricIntensity: 0.2,
          bloomIntensity: 0.3,
          exposure: 0.8,
          color: '#A0D2FF'
        });
        break;
        
      case 'unlockable':
        setLightConfig({
          volumetricIntensity: 1.5,
          bloomIntensity: 1.5,
          exposure: 1.2,
          color: '#FFD700'
        });
        break;
        
      case 'locked-pulsing':
        setLightConfig({
          volumetricIntensity: 0.8,
          bloomIntensity: 1.0,
          exposure: 1.0,
          color: '#FF6B6B'
        });
        break;
        
      default:
        setLightConfig({
          volumetricIntensity: 0.5,
          bloomIntensity: 0.8,
          exposure: 1.0,
          color: color
        });
    }
  }, [state, color]);
  
  // Animate light parameters
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Pulsing effect for locked state
    if (state === 'locked-pulsing') {
      const pulse = Math.sin(time * 2) * 0.2 + 0.8;
      setLightConfig(prev => ({
        ...prev,
        volumetricIntensity: 0.5 * pulse,
        bloomIntensity: 0.6 * pulse
      }));
    }
    
    // Breathing effect for unlockable state
    if (state === 'unlockable') {
      const breath = Math.sin(time * 1.5) * 0.3 + 0.7;
      setLightConfig(prev => ({
        ...prev,
        volumetricIntensity: 1.0 * breath,
        exposure: 1.0 + breath * 0.2
      }));
    }
  });
  
  // Setup lighting system
  useEffect(() => {
    // Add volumetric fog
    scene.fog = new THREE.FogExp2(lightConfig.color, 0.02);
    

    
    return () => {
      scene.fog = null;
    };
  }, [scene, camera, size, lightConfig.color]);
  
  // Dynamic light color based on time
  const dynamicColor = useMemo(() => {
    const baseColor = new THREE.Color(lightConfig.color);
    const time = performance.now() * 0.001;
    
    if (state === 'unlockable') {
      // Rainbow cycle for unlockable state
      const hue = (time * 0.1) % 1;
      baseColor.setHSL(hue, 0.8, 0.7);
    }
    
    return baseColor;
  }, [state, lightConfig.color]);
  
  return (
    <>
      {/* Volumetric Lighting */}
      {enableVolumetric && (
        <VolumetricLight
          intensity={lightConfig.volumetricIntensity}
          color={dynamicColor}
          position={[0, 1, 0]}
          scale={[12, 12, 12]}
        />
      )}
      
      {/* Environment Lighting */}
      <Environment preset="night" background blur={0.7}>
        {/* Sky gradient */}
        <Sky
          distance={450000}
          sunPosition={[100, 20, 100]}
          inclination={0}
          azimuth={0.25}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
          rayleigh={2}
          turbidity={10}
        />
        
        {/* Lightformer grid */}
        <LightformerGrid count={12} intensity={lightConfig.volumetricIntensity * 0.5} />
        
        {/* Ground plane with reflection */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial
            color="#1a1f2e"
            roughness={0.8}
            metalness={0.2}
            envMapIntensity={0.2}
          />
        </mesh>
      </Environment>
      
      {/* Main lighting setup */}
      <ambientLight intensity={intensity} color={dynamicColor} />
      
      {/* Dynamic directional lights */}
      <directionalLight
        position={[5, 10, 7]}
        intensity={0.6}
        color={dynamicColor}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />
      
      <directionalLight
        position={[-5, 5, -5]}
        intensity={0.3}
        color={state === 'locked-frost' ? '#A0D2FF' : '#FFD700'}
        castShadow
      />
      
      {/* Fill lights */}
      <hemisphereLight
        args={['#ffffff', '#0b0f1a', 0.2]}
        position={[0, 20, 0]}
      />
      
      {/* Accent lights */}
      <pointLight
        position={[3, 3, 3]}
        intensity={0.4}
        color="#FF6B6B"
        distance={20}
        decay={2}
      />
      
      <pointLight
        position={[-3, 2, -3]}
        intensity={0.4}
        color="#6B6BFF"
        distance={20}
        decay={2}
      />
      
      {/* Rim light for chest */}
      <rectAreaLight
        position={[0, 2, 5]}
        intensity={0.5}
        color={dynamicColor}
        width={10}
        height={10}
        lookAt={[0, 0, 0]}
      />
      
      {/* Post-processing */}
      {enableBloom && (
        <EffectComposer multisampling={8} disableNormalPass>
          <Bloom
            intensity={lightConfig.bloomIntensity}
            kernelSize={KernelSize.HUGE}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.1}
            height={size.height}
          />
          
          <ToneMapping
            blendFunction={BlendFunction.NORMAL}
            adaptive={true}
            resolution={256}
            middleGrey={0.6}
            maxLuminance={16.0}
            averageLuminance={1.0}
            adaptationRate={1.0}
          />
        </EffectComposer>
      )}
      
      {/* God Rays effect (expensive but beautiful) */}
      {enableGodRays && (
        <GodRaysEffect
          intensity={state === 'unlockable' ? 0.8 : 0.3}
          samples={40}
          density={0.96}
          decay={0.93}
          weight={0.4}
          exposure={lightConfig.exposure}
        />
      )}
      
      {/* Screen-space reflections */}
      <ScreenSpaceReflections
        intensity={0.5}
        roughnessThreshold={0.1}
        depthThreshold={0.1}
        depthScale={1}
        blur={0.1}
        maxRoughness={1}
        jitter={0.1}
        jitterSpread={0.1}
        steps={10}
        refineSteps={2}
        missedRays={true}
        useNormalMap={true}
        resolutionScale={1}
        velocityResolutionScale={1}
      />
    </>
  );
};

// God Rays Effect (Volumetric Light Scattering)
const GodRaysEffect = React.memo(({
  intensity = 0.5,
  samples = 30,
  density = 0.96,
  decay = 0.93,
  weight = 0.4,
  exposure = 1.0
}) => {
  const materialRef = useRef();
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uIntensity.value = intensity;
    }
  });
  
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          uTime: { value: 0 },
          uIntensity: { value: intensity },
          uSamples: { value: samples },
          uDensity: { value: density },
          uDecay: { value: decay },
          uWeight: { value: weight },
          uExposure: { value: exposure }
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uIntensity;
          uniform int uSamples;
          uniform float uDensity;
          uniform float uDecay;
          uniform float uWeight;
          uniform float uExposure;
          
          varying vec2 vUv;
          
          // Simplex noise
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
            vec2 uv = vUv - 0.5;
            vec2 direction = normalize(vec2(0.5) - uv);
            float illuminationDecay = 1.0;
            
            vec2 lightPos = vec2(0.5);
            vec2 deltaTexCoord = (uv - lightPos) * uDensity / float(uSamples);
            vec2 texCoord = uv;
            
            float color = 0.0;
            
            for (int i = 0; i < 100; i++) {
              if (i >= uSamples) break;
              
              texCoord -= deltaTexCoord;
              float sample = 1.0 - length(lightPos - texCoord);
              sample *= illuminationDecay * uWeight;
              color += sample;
              illuminationDecay *= uDecay;
              
              // Add noise-based variation
              float noise = snoise(texCoord * 10.0 + uTime * 0.5) * 0.1;
              color += noise;
            }
            
            color *= uIntensity * uExposure;
            
            // Apply color based on angle
            float angle = atan(direction.y, direction.x);
            vec3 rayColor = vec3(
              0.8 + 0.2 * sin(angle * 3.0 + uTime),
              0.6 + 0.2 * sin(angle * 2.0 + uTime * 1.5),
              0.4 + 0.2 * sin(angle * 1.5 + uTime * 2.0)
            );
            
            vec3 finalColor = rayColor * color;
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
});

// Screen Space Reflections
const ScreenSpaceReflections = React.memo((props) => {
  const effectRef = useRef();
  
  
  
  return null; // SSR would be implemented as a post-processing pass
});

// Performance-optimized version for mobile
const MobileOptimizedAmbientLight = (props) => {
  const isMobile = useMemo(() => window.innerWidth < 768, []);
  
  if (isMobile) {
    return (
      <>
        <ambientLight intensity={0.2} color={props.color} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={0.4}
          color={props.color}
        />
        <Environment preset="sunset" background={false} />
      </>
    );
  }
  
  return <AmbientLight {...props} />;
};

export default React.memo(MobileOptimizedAmbientLight);