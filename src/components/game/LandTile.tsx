import { Land, BuildingType, DevelopmentStage } from '@/types/game';
import { useRef, useMemo, memo, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Fountain, Bench } from './CityEnvironment';
import { Html } from '@react-three/drei';

// Cache textures to avoid recreating them
const textureCache = new Map<string, THREE.Texture>();

// Helper function to create procedural textures (with caching)
const createTexture = (color: string, pattern: 'solid' | 'grid' | 'grass' | 'concrete' = 'solid'): THREE.Texture => {
  const cacheKey = `${color}-${pattern}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }
  
  const size = 64; // Reduced from 256 to save memory
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  // Base color
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  
  if (pattern === 'grid') {
    // Grid pattern for roads (simplified)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < size; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  } else if (pattern === 'grass') {
    // Grass texture with less noise (reduced from 500 to 200)
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const shade = Math.random() * 30 - 15;
      ctx.fillStyle = `rgba(${Math.max(0, Math.min(255, 34 + shade))}, ${Math.max(0, Math.min(255, 139 + shade))}, ${Math.max(0, Math.min(255, 34 + shade))}, 0.3)`;
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (pattern === 'concrete') {
    // Concrete texture (reduced from 200 to 100)
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const shade = Math.random() * 20 - 10;
      ctx.fillStyle = `rgba(${Math.max(0, Math.min(255, 71 + shade))}, ${Math.max(0, Math.min(255, 85 + shade))}, ${Math.max(0, Math.min(255, 105 + shade))}, 0.2)`;
      ctx.fillRect(x, y, 3, 3);
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  textureCache.set(cacheKey, texture);
  return texture;
};

interface LandTileProps {
  land: Land;
  isSelected: boolean;
  onSelect: (land: Land) => void;
  lands?: Land[];
  isOwned?: boolean;
}

// Simplified tree component - just a cylinder for performance
const Tree = ({ position }: { position: [number, number, number] }) => {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.05, 0.05, 0.3, 4]} />
      <meshStandardMaterial color="#228b22" />
    </mesh>
  );
};

// Fence component
const Fence = ({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) => {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Fence post */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.02, 0.2, 0.02]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
      {/* Fence rail */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.3, 0.02, 0.02]} />
        <meshStandardMaterial color="#654321" />
      </mesh>
    </group>
  );
};

const Building3D = ({ type, stage, floors = 1 }: { type: BuildingType; stage: DevelopmentStage; floors?: number }) => {
  if (!type || stage === 'empty') return null;

  const baseHeight = stage === 'foundation' ? 0.1 : stage === 'construction' ? 0.5 : 1;
  const floorHeight = 0.25;
  const totalHeight = baseHeight * (stage === 'complete' ? Math.max(1, floors) * floorHeight : 1);
  const opacity = stage === 'construction' ? 0.7 : 1;
  const buildingWidth = 0.7;
  const buildingDepth = 0.7;

  // Construction stage rendering (same for all)
  if (stage !== 'complete') {
    return (
      <mesh position={[0, totalHeight / 2, 0]}>
        <boxGeometry args={[buildingWidth, totalHeight, buildingDepth]} />
        <meshStandardMaterial color="#888" transparent={stage === 'construction'} opacity={opacity} />
      </mesh>
    );
  }

  const numFloors = Math.max(1, floors || 1);
  const actualHeight = Math.max(0.5, numFloors * floorHeight);

  // Render distinct building types
  switch (type) {
    case 'house': {
      // Small house with pitched roof
      return (
        <group>
          <mesh position={[0, actualHeight * 0.4, 0]}>
            <boxGeometry args={[0.6, actualHeight * 0.8, 0.6]} />
            <meshStandardMaterial color="#d4a574" roughness={0.8} />
          </mesh>
          {/* Pitched roof */}
          <mesh position={[0, actualHeight * 0.8 + 0.15, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.5, 0.3, 4]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          {/* Door */}
          <mesh position={[0, 0.1, 0.31]}>
            <boxGeometry args={[0.15, 0.25, 0.02]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
        </group>
      );
    }

    case 'apartment': {
      // Taller rectangular building with windows
      return (
        <group>
          <mesh position={[0, actualHeight / 2, 0]}>
            <boxGeometry args={[0.65, actualHeight, 0.65]} />
            <meshStandardMaterial color="#a0a0a0" roughness={0.7} />
          </mesh>
          {/* Windows grid */}
          {Array.from({ length: Math.min(numFloors, 5) }).map((_, i) => (
            <group key={i}>
              <mesh position={[-0.2, (i + 0.5) * floorHeight, 0.33]}>
                <boxGeometry args={[0.1, 0.15, 0.01]} />
                <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
              </mesh>
              <mesh position={[0.2, (i + 0.5) * floorHeight, 0.33]}>
                <boxGeometry args={[0.1, 0.15, 0.01]} />
                <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
              </mesh>
            </group>
          ))}
          {/* Flat roof */}
          <mesh position={[0, actualHeight + 0.05, 0]}>
            <boxGeometry args={[0.7, 0.1, 0.7]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      );
    }

    case 'skyscraper': {
      // Very tall, narrow building
      const skyscraperHeight = Math.max(1.5, actualHeight * 1.5);
      return (
        <group>
          <mesh position={[0, skyscraperHeight / 2, 0]}>
            <boxGeometry args={[0.5, skyscraperHeight, 0.5]} />
            <meshStandardMaterial color="#708090" roughness={0.6} metalness={0.3} />
          </mesh>
          {/* Windows all around */}
          {Array.from({ length: Math.min(numFloors, 8) }).map((_, i) => (
            <group key={i}>
              {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((rot, j) => (
                <mesh key={j} position={[0, (i + 0.5) * floorHeight * 1.5, 0.26]} rotation={[0, rot, 0]}>
                  <boxGeometry args={[0.08, 0.12, 0.01]} />
                  <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.3} />
                </mesh>
              ))}
            </group>
          ))}
          {/* Spire */}
          <mesh position={[0, skyscraperHeight + 0.2, 0]}>
            <coneGeometry args={[0.1, 0.4, 8]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        </group>
      );
    }

    case 'shop': {
      // Wide, low building with storefront
      return (
        <group>
          <mesh position={[0, actualHeight * 0.4, 0]}>
            <boxGeometry args={[0.8, actualHeight * 0.8, 0.6]} />
            <meshStandardMaterial color="#ff6b6b" roughness={0.8} />
          </mesh>
          {/* Large storefront window */}
          <mesh position={[0, actualHeight * 0.4, 0.31]}>
            <boxGeometry args={[0.6, actualHeight * 0.6, 0.02]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.7} />
          </mesh>
          {/* Sign */}
          <mesh position={[0, actualHeight * 0.8, 0.32]}>
            <boxGeometry args={[0.5, 0.1, 0.02]} />
            <meshStandardMaterial color="#ff0000" />
          </mesh>
          {/* Flat roof */}
          <mesh position={[0, actualHeight * 0.8 + 0.05, 0]}>
            <boxGeometry args={[0.85, 0.1, 0.65]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      );
    }

    case 'mall': {
      // Large, flat building
      return (
        <group>
          <mesh position={[0, actualHeight * 0.3, 0]}>
            <boxGeometry args={[0.9, actualHeight * 0.6, 0.9]} />
            <meshStandardMaterial color="#4ecdc4" roughness={0.7} />
          </mesh>
          {/* Multiple entrances */}
          {[-0.3, 0, 0.3].map((x, i) => (
            <mesh key={i} position={[x, 0.15, 0.46]}>
              <boxGeometry args={[0.15, 0.3, 0.02]} />
              <meshStandardMaterial color="#2c3e50" />
            </mesh>
          ))}
          {/* Flat roof */}
          <mesh position={[0, actualHeight * 0.6 + 0.05, 0]}>
            <boxGeometry args={[0.95, 0.1, 0.95]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      );
    }

    case 'office': {
      // Modern office building with glass
      return (
        <group>
          <mesh position={[0, actualHeight / 2, 0]}>
            <boxGeometry args={[0.7, actualHeight, 0.7]} />
            <meshStandardMaterial color="#2196F3" roughness={0.3} metalness={0.5} />
          </mesh>
          {/* Glass windows */}
          {Array.from({ length: Math.min(numFloors, 6) }).map((_, i) => (
            <mesh key={i} position={[0, (i + 0.5) * floorHeight, 0.36]}>
              <boxGeometry args={[0.65, floorHeight * 0.8, 0.01]} />
              <meshStandardMaterial color="#87ceeb" transparent opacity={0.4} />
            </mesh>
          ))}
          {/* Modern flat roof */}
          <mesh position={[0, actualHeight + 0.05, 0]}>
            <boxGeometry args={[0.75, 0.1, 0.75]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      );
    }

    case 'factory': {
      // Industrial building with smokestacks
      return (
        <group>
          <mesh position={[0, actualHeight * 0.4, 0]}>
            <boxGeometry args={[0.8, actualHeight * 0.8, 0.8]} />
            <meshStandardMaterial color="#FF9800" roughness={0.9} />
          </mesh>
          {/* Smokestacks */}
          <mesh position={[-0.25, actualHeight * 0.8 + 0.3, -0.25]}>
            <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
            <meshStandardMaterial color="#666" />
          </mesh>
          <mesh position={[0.25, actualHeight * 0.8 + 0.3, 0.25]}>
            <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
            <meshStandardMaterial color="#666" />
          </mesh>
          {/* Industrial roof */}
          <mesh position={[0, actualHeight * 0.8 + 0.05, 0]}>
            <boxGeometry args={[0.85, 0.1, 0.85]} />
            <meshStandardMaterial color="#424242" />
          </mesh>
        </group>
      );
    }

    case 'warehouse': {
      // Large warehouse with flat roof
      return (
        <group>
          <mesh position={[0, actualHeight * 0.3, 0]}>
            <boxGeometry args={[0.9, actualHeight * 0.6, 0.9]} />
            <meshStandardMaterial color="#9E9E9E" roughness={0.8} />
          </mesh>
          {/* Large door */}
          <mesh position={[0, 0.2, 0.46]}>
            <boxGeometry args={[0.4, 0.4, 0.02]} />
            <meshStandardMaterial color="#555" />
          </mesh>
          {/* Flat roof */}
          <mesh position={[0, actualHeight * 0.6 + 0.05, 0]}>
            <boxGeometry args={[0.95, 0.1, 0.95]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      );
    }

    case 'powerplant': {
      // Power plant with cooling towers
      return (
        <group>
          <mesh position={[0, actualHeight * 0.4, 0]}>
            <boxGeometry args={[0.7, actualHeight * 0.8, 0.7]} />
            <meshStandardMaterial color="#424242" roughness={0.9} />
          </mesh>
          {/* Cooling towers */}
          <mesh position={[-0.3, actualHeight * 0.4 + 0.4, 0]}>
            <cylinderGeometry args={[0.12, 0.15, 0.8, 8]} />
            <meshStandardMaterial color="#666" />
          </mesh>
          <mesh position={[0.3, actualHeight * 0.4 + 0.4, 0]}>
            <cylinderGeometry args={[0.12, 0.15, 0.8, 8]} />
            <meshStandardMaterial color="#666" />
          </mesh>
        </group>
      );
    }

    case 'farm': {
      // Barn-like structure
      return (
        <group>
          <mesh position={[0, actualHeight * 0.4, 0]}>
            <boxGeometry args={[0.7, actualHeight * 0.8, 0.7]} />
            <meshStandardMaterial color="#8BC34A" roughness={0.8} />
          </mesh>
          {/* Barn roof (triangular) */}
          <mesh position={[0, actualHeight * 0.8 + 0.2, 0]}>
            <coneGeometry args={[0.6, 0.4, 4]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          {/* Barn door */}
          <mesh position={[0, 0.15, 0.36]}>
            <boxGeometry args={[0.3, 0.3, 0.02]} />
            <meshStandardMaterial color="#654321" />
          </mesh>
        </group>
      );
    }

    case 'greenhouse': {
      // Glass greenhouse structure
  return (
    <group>
          {/* Base */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.7, 0.2, 0.7]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          {/* Glass walls */}
          <mesh position={[0, actualHeight * 0.5, 0]}>
            <boxGeometry args={[0.7, actualHeight, 0.7]} />
            <meshStandardMaterial color="#90EE90" transparent opacity={0.3} />
          </mesh>
          {/* Glass roof (pyramid) */}
          <mesh position={[0, actualHeight + 0.2, 0]}>
            <coneGeometry args={[0.5, 0.4, 4]} />
            <meshStandardMaterial color="#66bb6a" transparent opacity={0.4} />
      </mesh>
        </group>
      );
    }

    case 'silo': {
      // Cylindrical silo tower
      const siloHeight = Math.max(1.2, actualHeight * 1.2);
      return (
        <group>
          <mesh position={[0, siloHeight / 2, 0]}>
            <cylinderGeometry args={[0.3, 0.3, siloHeight, 16]} />
            <meshStandardMaterial color="#bcaaa4" roughness={0.7} />
          </mesh>
          {/* Conical top */}
          <mesh position={[0, siloHeight + 0.15, 0]}>
            <coneGeometry args={[0.3, 0.3, 16]} />
            <meshStandardMaterial color="#8b7355" />
          </mesh>
          {/* Access ladder */}
          <mesh position={[0.32, siloHeight / 2, 0]}>
            <boxGeometry args={[0.02, siloHeight * 0.8, 0.02]} />
            <meshStandardMaterial color="#654321" />
        </mesh>
        </group>
      );
    }

    default: {
      // Default building (fallback)
      return (
        <group>
          <mesh position={[0, actualHeight / 2, 0]}>
            <boxGeometry args={[buildingWidth, actualHeight, buildingDepth]} />
            <meshStandardMaterial color="#9E9E9E" roughness={0.8} />
          </mesh>
          <mesh position={[0, actualHeight + 0.05, 0]}>
        <boxGeometry args={[buildingWidth + 0.05, 0.1, buildingDepth + 0.05]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
    }
  }
};

export const LandTile = memo(({ land, isSelected, onSelect, lands = [], isOwned = false }: LandTileProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [clickScale, setClickScale] = useState(1);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = useCallback(() => {
    if (land.zone !== 'road') {
      // Zoom-in animation
      setClickScale(1.1);
      setTimeout(() => setClickScale(1), 150);
      onSelect(land);
    }
  }, [land.zone, onSelect]);

  const handlePointerEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (land.zone !== 'road') {
      setIsHovered(true);
    }
  }, [land.zone]);

  const handlePointerLeave = useCallback(() => {
    // Small delay to prevent flickering
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 50);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const position: [number, number, number] = useMemo(
    () => [land.x - 15, 0, land.y - 15],
    [land.x, land.y]
  );

  const tileColor = useMemo(() => {
    const colors = {
      residential: '#10b981',
      commercial: '#3b82f6',
      industrial: '#f59e0b',
      agricultural: '#84cc16',
      park: '#22c55e',
      road: '#475569',
    };
    return colors[land.zone];
  }, [land.zone]);
  
  // Create texture for ground
  const groundTexture = useMemo(() => {
    let pattern: 'solid' | 'grid' | 'grass' | 'concrete' = 'solid';
    if (land.zone === 'road') pattern = 'grid';
    else if (land.zone === 'park' || land.zone === 'agricultural') pattern = 'grass';
    else if (land.zone === 'commercial' || land.zone === 'industrial') pattern = 'concrete';
    return createTexture(tileColor, pattern);
  }, [land.zone, tileColor]);

  // Border glow color based on zone
  const borderGlowColor = useMemo(() => {
    const colors = {
      residential: '#10b981',
      commercial: '#3b82f6',
      industrial: '#f59e0b',
      agricultural: '#84cc16',
      park: '#22c55e',
      road: '#475569',
    };
    return colors[land.zone];
  }, [land.zone]);

  // Check if this is a road and determine orientation
  const isRoad = land.zone === 'road';
  // Check if there are roads in the same row (horizontal road)
  const isHorizontalRoad = isRoad && lands.some(l => l.x === land.x && l.y !== land.y && l.zone === 'road');
  // Check if there are roads in the same column (vertical road)
  const isVerticalRoad = isRoad && lands.some(l => l.x !== land.x && l.y === land.y && l.zone === 'road');
  
  return (
    <group position={position} scale={clickScale}>
      <mesh 
        ref={meshRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        onClick={handleClick} 
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        userData={{ landId: land.id }}
      >
        <planeGeometry args={[0.98, 0.98]} />
        <meshStandardMaterial 
          map={groundTexture}
          color={tileColor} 
          emissive={isHovered ? borderGlowColor : '#000000'}
          emissiveIntensity={isHovered ? 0.3 : 0}
        />
      </mesh>

      {/* Hover highlight border */}
      {isHovered && !isSelected && !isRoad && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.48, 0.49, 32]} />
          <meshStandardMaterial 
            color={borderGlowColor}
            emissive={borderGlowColor}
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Tooltip on hover - only render when actually hovered to prevent flickering */}
      {isHovered && !isRoad && (
        <Html 
          position={[0, 0.5, 0]} 
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none', transition: 'opacity 0.1s ease-in-out' }}
        >
          <div 
            className="px-3 py-2 rounded-lg text-white text-xs whitespace-nowrap"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${borderGlowColor}`,
              boxShadow: `0 0 12px ${borderGlowColor}40`,
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          >
            <div className="font-semibold">Plot #{land.id}</div>
            <div className="text-white/70">Zone: {land.zone}</div>
            <div className="text-white/70">Coords: ({land.x}, {land.y})</div>
            {land.owner && (
              <div className="text-white/70">
                Owner: {land.owner === 'player' ? 'You' : 'Other'}
              </div>
            )}
          </div>
        </Html>
      )}

      {/* Road lane markings for 2-way roads */}
      {isRoad && (
        <>
          {/* Center line (dashed yellow) */}
          {isHorizontalRoad && (
            <>
              {/* Dashed center line */}
              {Array.from({ length: 5 }).map((_, i) => (
                <mesh key={`dash-${i}`} position={[0, 0.005, (i - 2) * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.02, 0.15]} />
                  <meshStandardMaterial color="#ffeb3b" />
                </mesh>
              ))}
            </>
          )}
          {isVerticalRoad && (
            <>
              {/* Dashed center line */}
              {Array.from({ length: 5 }).map((_, i) => (
                <mesh key={`dash-${i}`} position={[(i - 2) * 0.2, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.15, 0.02]} />
                  <meshStandardMaterial color="#ffeb3b" />
                </mesh>
              ))}
            </>
          )}
          {/* Side lines (white) */}
          <mesh position={[-0.49, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.02, 0.98]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.49, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.02, 0.98]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0.005, -0.49]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.98, 0.02]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0.005, 0.49]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.98, 0.02]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </>
      )}

      {/* Selected indicator - border glow based on zone */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.48, 0.49, 32]} />
          <meshStandardMaterial 
            color={borderGlowColor}
            emissive={borderGlowColor}
            emissiveIntensity={1.2}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Owned indicator - glowing pillar */}
      {isOwned && !isSelected && (
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
          <meshStandardMaterial 
            color="#00FF00" 
            emissive="#00FF00"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {land.building && <Building3D type={land.building.type} stage={land.building.stage} floors={land.building.floors} />}

      {land.zone === 'park' && !land.building && (
        <>
          <Fountain position={[0, 0, 0]} />
          <Bench position={[-0.3, 0, 0.3]} />
          <Bench position={[0.3, 0, -0.3]} />
          {/* Add trees to parks */}
          <Tree position={[-0.4, 0, -0.4]} />
          <Tree position={[0.4, 0, 0.4]} />
          <Tree position={[0, 0, 0.4]} />
        </>
      )}
      
      {/* Add fences to residential properties */}
      {land.zone === 'residential' && land.building && land.building.stage === 'complete' && (
        <>
          <Fence position={[-0.45, 0, -0.45]} rotation={0} />
          <Fence position={[0.45, 0, -0.45]} rotation={0} />
          <Fence position={[-0.45, 0, 0.45]} rotation={Math.PI} />
          <Fence position={[0.45, 0, 0.45]} rotation={Math.PI} />
        </>
      )}
      
      {/* Add trees to agricultural zones - use deterministic seed based on land.id */}
      {land.zone === 'agricultural' && !land.building && (() => {
        // Create a simple hash from land.id for deterministic tree placement
        let hash = 0;
        for (let i = 0; i < land.id.length; i++) {
          hash = ((hash << 5) - hash) + land.id.charCodeAt(i);
          hash = hash & hash; // Convert to 32bit integer
        }
        const seed = Math.abs(hash) % 100;
        if (seed > 70) {
          // Use seed to determine tree position (deterministic)
          const xPos = ((seed % 20) / 20 - 0.5) * 0.6;
          const zPos = ((Math.floor(seed / 20) % 20) / 20 - 0.5) * 0.6;
          return <Tree key={`tree-${land.id}`} position={[xPos, 0, zPos]} />;
        }
        return null;
      })()}

      {land.building?.crop && (
        <group>
          {Array.from({ length: 16 }).map((_, i) => {
            const x = (i % 4) * 0.2 - 0.3;
            const z = Math.floor(i / 4) * 0.2 - 0.3;
            const growthScale = land.building!.crop!.growthStage / 100;
            return (
              <mesh key={i} position={[x, 0.05 * growthScale, z]}>
                <coneGeometry args={[0.03, 0.1 * growthScale, 4]} />
                <meshStandardMaterial color="#8BC34A" />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
});
