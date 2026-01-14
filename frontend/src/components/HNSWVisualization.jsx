import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line, RoundedBox, Environment, Stars, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// Configuration
const LAYERS = [
  { level: 4, y: 2.0, count: 5 },   // Highest layer - fewest nodes
  { level: 3, y: 0.8, count: 6 },
  { level: 2, y: -0.4, count: 8 },
  { level: 1, y: -1.6, count: 11 },
  { level: 0, y: -2.8, count: 23 }, // Base layer - most nodes
];

const PLANE_SIZE = [4.5, 0.05, 3.0];
const BOUNDS = { x: 1.8, z: 1.2 };

// Performance Optimized Glass (Standard Material instead of Physical)
// Performance Optimized Glass (Standard Material instead of Physical)
function SimpleGlassPlane({ y, level }) {
  return (
    <group position={[0, y, 0]}>
      {/* Visual Glass Block */}
      <RoundedBox args={PLANE_SIZE} radius={0.1} smoothness={4}>
        <meshStandardMaterial 
          color="#a5b4fc"
          transparent
          opacity={0.05} // Ultra-clear for top-down visibility
          roughness={0.1}
          metalness={0.1} // Reduced reflection to see through better
          side={THREE.DoubleSide}
          depthWrite={false} // Crucial: Don't block things behind
        />
      </RoundedBox>
      
      {/* Vertical Label (Standing Up, Facing Camera Corner) */}
      <Text 
        position={[-2.6, 0.25, 0]} 
        rotation={[0, Math.PI / 4, 0]} // rotated 45deg Y to face the isometric camera
        color="#818cf8" 
        fontSize={0.15}
        fontWeight={800}
        anchorX="right"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
      >
        LAYER {level}
      </Text>
    </group>
  );
}

function OptimizedNode({ position, isActive, isEntry, isQuery, nodeId, embedding, onHover }) {
  // Static color logic
  const activeColor = new THREE.Color('#f97316'); // Orange
  const defaultColor = new THREE.Color('#94a3b8'); // Slate
  const color = isActive || isEntry || isQuery ? activeColor : defaultColor;
  const [hovered, setHovered] = React.useState(false);
  
  return (
    <group position={position}>
      {/* The Node Sphere */}
      <mesh 
        scale={[1, 1, 1]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover?.({ nodeId, embedding, position }); }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); onHover?.(null); }}
      >
        <sphereGeometry args={[hovered ? 0.1 : (isActive ? 0.08 : 0.06), 16, 16]} /> 
        <meshStandardMaterial 
            color={hovered ? new THREE.Color('#ffffff') : color}
            emissive={hovered ? new THREE.Color('#ffffff') : color}
            emissiveIntensity={hovered ? 1.5 : (isActive ? 1.0 : 0.2)}
            roughness={0.2}
        />
      </mesh>
      
      {/* FAKE GLOW: A simple transparent sprite/billboard is much cheaper than Bloom */}
      {(isActive || isEntry || isQuery || hovered) && (
        <mesh position={[0, 0, 0]}>
             <sphereGeometry args={[0.2, 16, 16]} />
             <meshBasicMaterial 
                color={hovered ? new THREE.Color('#ffffff') : color} 
                transparent 
                opacity={hovered ? 0.5 : 0.3} 
                depthWrite={false} // Additive blending trick
                blending={THREE.AdditiveBlending}
             />
        </mesh>
      )}
    </group>
  );
}

function FastConnections({ nodes }) {
    // Calculate lines once - only horizontal connections within layers
    const lines = useMemo(() => {
        const segs = [];
        
        LAYERS.forEach(layer => {
            const lNodes = nodes.filter(n => n.level === layer.level);
            for (let i = 0; i < lNodes.length; i++) {
                 // Connect to 4 nearest neighbors for a denser web
                 const neighbors = lNodes.filter(n => n !== lNodes[i])
                    .sort((a,b) => 
                        new THREE.Vector3(...a.position).distanceTo(new THREE.Vector3(...lNodes[i].position)) - 
                        new THREE.Vector3(...b.position).distanceTo(new THREE.Vector3(...lNodes[i].position))
                    ).slice(0, 4);
                  neighbors.forEach(n => { segs.push(lNodes[i].position); segs.push(n.position); });
            }
        });
        
        return segs;
    }, [nodes]);

    return (
        <group>
             {/* Horizontal Layer Connections (Solid) - X-RAY MODE ON */}
             <Line 
                segments 
                points={lines} 
                color="#ffffff" 
                opacity={0.08} 
                transparent 
                lineWidth={2} 
                depthWrite={false}
                depthTest={false}
                renderOrder={1}
             />
        </group>
    )
}

// Animated Path Component
function AnimatedPath({ points }) {
    const [displayedPoints, setDisplayedPoints] = React.useState([]);
    const progressRef = useRef(0);
    const speed = 0.8; // Increased speed for faster flow

    useEffect(() => {
        // Reset animation when points change
        progressRef.current = 0;
        setDisplayedPoints([points[0]]);
    }, [points]);

    useFrame((state, delta) => {
        if (!points || points.length < 2) return;
        
        // Progress goes from 0 to (points.length - 1)
        const targetTotal = points.length - 1;
        
        if (progressRef.current < targetTotal) {
            progressRef.current += delta * speed;
            
            // Clamp
            if (progressRef.current > targetTotal) progressRef.current = targetTotal;

            const currentSegmentIndex = Math.floor(progressRef.current);
            const segmentProgress = progressRef.current - currentSegmentIndex;
            
            // Current list of full points
            const currentPoints = points.slice(0, currentSegmentIndex + 1);
            
            // If we are between points, calculate interpolated tip
            if (currentSegmentIndex < points.length - 1) {
                const p1 = new THREE.Vector3(...points[currentSegmentIndex]);
                const p2 = new THREE.Vector3(...points[currentSegmentIndex + 1]);
                const tip = new THREE.Vector3().lerpVectors(p1, p2, segmentProgress);
                currentPoints.push([tip.x, tip.y, tip.z]);
            }
            
            setDisplayedPoints(currentPoints);
        }
    });

    if (displayedPoints.length < 2) return null;

    return (
        <Line 
            points={displayedPoints}
            color="#f97316"
            lineWidth={2} // Fixed width, absolutely no pulsing
            opacity={0.8}
            transparent
            depthTest={false} // Always visible on top
            renderOrder={2}
        />
    );
}

function EfficientScene({ isSearching, currentQuery }) {
  const [hoveredNode, setHoveredNode] = React.useState(null);
  const [displayQuery, setDisplayQuery] = React.useState('');
  
  const nodes = useMemo(() => {
    let all = [];
    LAYERS.forEach(layer => {
      for (let i = 0; i < layer.count; i++) {
        // Generate mock embedding (8 dimensions for display)
        const embedding = Array.from({ length: 8 }, () => (Math.random() * 2 - 1).toFixed(3));
        
        all.push({
          id: `n-${layer.level}-${i}`,
          level: layer.level,
          embedding,
          position: [
            (Math.random() - 0.5) * 2 * BOUNDS.x, 
            layer.y + 0.1, 
            (Math.random() - 0.5) * 2 * BOUNDS.z
          ]
        });
      }
    });
    
    return all;
  }, []);

  const [path, setPath] = React.useState([]);
  const [hasQueried, setHasQueried] = React.useState(false);

  useEffect(() => {
      if(isSearching) {
          // Mark that we have an active query (persists until next query)
          setHasQueried(true);
          setDisplayQuery(currentQuery);
          
          // Generate a realistic HNSW path with 8 total touches
          // Can include horizontal exploration within layers before descending
          const l4Nodes = nodes.filter(n => n.level === 4);
          const l3Nodes = nodes.filter(n => n.level === 3);
          const l2Nodes = nodes.filter(n => n.level === 2);
          const l1Nodes = nodes.filter(n => n.level === 1);
          const l0Nodes = nodes.filter(n => n.level === 0);
          
          const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
          const pickMultiple = (arr, count) => {
              const shuffled = [...arr].sort(() => Math.random() - 0.5);
              return shuffled.slice(0, Math.min(count, arr.length));
          };
          
          // Build path with 8 touches total, randomly distributing horizontal exploration
          let newPath = [];
          
          // L4: 1-2 touches
          const l4Touches = Math.random() > 0.5 ? 2 : 1;
          newPath.push(...pickMultiple(l4Nodes, l4Touches));
          
          // L3: 1-2 touches
          const l3Touches = Math.random() > 0.5 ? 2 : 1;
          newPath.push(...pickMultiple(l3Nodes, l3Touches));
          
          // L2: 1-2 touches  
          const l2Touches = Math.random() > 0.6 ? 2 : 1;
          newPath.push(...pickMultiple(l2Nodes, l2Touches));
          
          // L1: 1-2 touches
          const l1Touches = Math.random() > 0.5 ? 2 : 1;
          newPath.push(...pickMultiple(l1Nodes, l1Touches));
          
          // L0: Fill remaining to reach 8 total
          const remaining = 8 - newPath.length;
          newPath.push(...pickMultiple(l0Nodes, Math.max(1, remaining)));
          
          // Ensure exactly 8 touches
          newPath = newPath.slice(0, 8);
          
          setPath(newPath.filter(Boolean));
      }
      // Removed cleanup: Path persists until next search for better visibility
  }, [isSearching, currentQuery, nodes]);

  return (
    <>
      {/* Simple Lighting Setup */}
      <ambientLight intensity={0.5} color="#4338ca" />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
      
      {/* Low-cost environment */}
      <Environment preset="night" blur={1} />
      
      {/* Stars are efficient enough */}
      <Stars radius={50} depth={20} count={1000} factor={4} fade speed={1} />

      <group rotation={[0, -Math.PI / 6, 0]} position={[0.5, -0.2, 0]}>
        {LAYERS.map(l => <SimpleGlassPlane key={l.level} y={l.y} level={l.level} />)}
        <FastConnections nodes={nodes} />
        
        {nodes.map((n, i) => (
            <OptimizedNode 
              key={i} 
              {...n} 
              nodeId={n.id}
              isActive={path.includes(n)} 
              onHover={setHoveredNode}
            />
        ))}

        {path.length > 1 && (
             <AnimatedPath points={path.map(n => n.position)} />
        )}
        
        {/* Query Injection Indicator - Points to first node in path */}
        {hasQueried && path.length > 0 && path[0] && (
          <group position={[path[0].position[0], path[0].position[1] + 0.5, path[0].position[2]]}>
            {/* Glowing Query Orb - Small */}
            <mesh>
              <sphereGeometry args={[0.06, 32, 32]} />
              <meshStandardMaterial 
                color="#f97316"
                emissive="#f97316"
                emissiveIntensity={2}
              />
            </mesh>
            {/* Outer Glow - Small */}
            <mesh>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshBasicMaterial 
                color="#f97316"
                transparent
                opacity={0.4}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            {/* Injection beam going down to the node */}
            <mesh position={[0, -0.25, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
              <meshBasicMaterial 
                color="#f97316"
                transparent
                opacity={0.6}
              />
            </mesh>
            {/* Label - Premium Speech Bubble - Positioned closer to orb */}
            <Html position={[0, 0.35, 0]} center style={{ pointerEvents: 'none' }}>
              <div className="relative">
                {/* Glow Effect Behind */}
                <div className="absolute inset-0 bg-orange-500/30 blur-xl rounded-2xl scale-110"></div>
                {/* Speech Bubble */}
                <div className="relative bg-gradient-to-b from-zinc-900 to-black rounded-2xl px-5 py-3 shadow-2xl min-w-[120px] border border-orange-500/40">
                  <div className="text-[13px] font-semibold text-white text-center tracking-wide">"{displayQuery || '...'}"</div>
                </div>
                {/* Triangle Pointer */}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-black"></div>
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-[10px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-orange-500/40"></div>
              </div>
            </Html>
          </group>
        )}
      </group>

      {/* Embedding Tooltip - Positioned well above the node */}
      {hoveredNode && (
        <Html
          position={[hoveredNode.position[0], hoveredNode.position[1] + 0.6, hoveredNode.position[2]]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 shadow-xl min-w-[180px]">
            <div className="text-[10px] font-mono text-blue-400 mb-1 uppercase tracking-wider">{hoveredNode.nodeId}</div>
            <div className="text-[10px] font-mono text-white/70 leading-relaxed">
              [{hoveredNode.embedding?.slice(0, 4).join(', ')}]
              <br/>
              [{hoveredNode.embedding?.slice(4, 8).join(', ')}]
            </div>
          </div>
        </Html>
      )}

      <OrbitControls 
        enableRotate={true}
        enableZoom={false} 
        enablePan={false}
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={20}
      />
    </>
  );
}

export function HNSWVisualization({ isSearching, currentQuery }) {
  return (
    <div className="w-full h-full relative" style={{ 
        background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #000000 100%)'
    }}>
      {/* Title */}
      <div className="absolute top-6 right-6 z-10 text-right pointer-events-none">
          <h2 className="text-2xl font-bold text-indigo-100/90 tracking-tight">HNSW Space</h2>
          <p className="text-xs text-indigo-400 font-mono mt-1">VISUALIZATION MODE</p>
      </div>
      
      {/* HNSW Parameters Panel */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 space-y-2">
              <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider mb-2">HNSW Config</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <span className="text-white/40">M:</span>
                  <span className="text-white/80 font-mono">16</span>
                  <span className="text-white/40">efConstruction:</span>
                  <span className="text-white/80 font-mono">100</span>
                  <span className="text-white/40">efSearch:</span>
                  <span className="text-white/80 font-mono">50</span>
                  <span className="text-white/40">Distance:</span>
                  <span className="text-white/80 font-mono">Cosine</span>
                  <span className="text-white/40">Dimensions:</span>
                  <span className="text-white/80 font-mono">1024</span>
              </div>
          </div>
      </div>

      <Canvas 
        dpr={[1, 1.5]} // Cap DPI to save GPU
        camera={{ position: [10, 8, 10], fov: 30 }} 
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <EfficientScene isSearching={isSearching} currentQuery={currentQuery} />
      </Canvas>
    </div>
  );
}
