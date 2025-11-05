import { useRef, Suspense, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float, Environment, ContactShadows, OrbitControls, Box } from '@react-three/drei';

class Model3DErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('3D Model Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
          <pointLight position={[-10, -10, -10]} />
          <FallbackModel position={[0, 0, 0]} />
          <OrbitControls enablePan={false} enableZoom={false} enableRotate={true} autoRotate={false} />
          <Environment preset="sunset" />
        </Canvas>
      );
    }

    return this.props.children;
  }
}

function NavigationModel({ ...props }) {
  const meshRef = useRef();

  const { nodes } = useGLTF('/Navigatie.gltf');

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  const modelNode = nodes?.Scene || nodes?.Object_0 || (nodes ? Object.values(nodes)[0] : null);

  if (!modelNode) {
    return <FallbackModel {...props} />;
  }

  return (
    <Float
      speed={1.5}
      rotationIntensity={0.2}
      floatIntensity={0.3}
    >
      <primitive
        ref={meshRef}
        object={modelNode}
        scale={20}
        {...props}
      />
    </Float>
  );
}

function FallbackModel({ ...props }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <Box ref={meshRef} args={[2, 1.5, 0.3]} {...props}>
        <meshStandardMaterial color="#2563eb" />
      </Box>
    </Float>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full h-96 md:h-[500px] flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading 3D model...</p>
      </div>
    </div>
  );
}

function NavigationModel3D() {
  return (
    <div className="w-full h-96 md:h-[500px]">
      <Model3DErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
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
        </Suspense>
      </Model3DErrorBoundary>
    </div>
  );
}

export default NavigationModel3D;