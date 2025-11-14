import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float, Environment, ContactShadows, OrbitControls } from '@react-three/drei';

function NavigationModel({ ...props }) {
  const { nodes } = useGLTF('/Navigatie.gltf');
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.2}
      floatIntensity={0.3}
    >
      <primitive
        ref={meshRef}
        object={nodes.Scene || nodes.Object_0 || Object.values(nodes)[0]}
        scale={20}
        {...props}
      />
    </Float>
  );
}

function NavigationModel3D() {
  return (
    <div className="w-full h-96 md:h-[500px]">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        className="cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        
        <NavigationModel position={[0, 0, 0]} />
        
        <OrbitControls 
          enablePan={false}
          enableZoom={false}
          enableRotate={true}
          autoRotate={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI - Math.PI / 4}
        />
        
        <Environment preset="sunset" />
        <ContactShadows
          position={[0, -2, 0]}
          opacity={0.4}
          scale={10}
          blur={1.5}
          far={4.5}
        />
      </Canvas>
    </div>
  );
}

export default NavigationModel3D;