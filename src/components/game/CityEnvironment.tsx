import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Land } from '@/types/game';

type CarState = 'parked' | 'moving' | 'waiting';

// Create a road map for faster lookups (memoized)
const createRoadMap = (lands: Land[]): Set<string> => {
  const roadMap = new Set<string>();
  lands.forEach(land => {
    if (land.zone === 'road') {
      roadMap.add(`${land.x}-${land.y}`);
    }
  });
  return roadMap;
};

// Helper function to check if a position is on a road (optimized with map)
const isOnRoad = (x: number, z: number, roadMap: Set<string>): boolean => {
  // Convert 3D position back to grid coordinates
  const gridX = Math.round(x + 15);
  const gridY = Math.round(z + 15);
  
  // Clamp to valid grid range
  if (gridX < 0 || gridX >= 30 || gridY < 0 || gridY >= 30) {
    return false;
  }
  
  // Fast lookup using Set
  return roadMap.has(`${gridX}-${gridY}`);
};

// Helper function to get nearest road position
const getNearestRoadPosition = (x: number, z: number, direction: 'x' | 'z'): [number, number] => {
  // Road positions in 3D space (every 6 blocks: -15, -9, -3, 3, 9, 15)
  const roadPositions = [-15, -9, -3, 3, 9, 15];
  
  if (direction === 'x') {
    // For horizontal movement, snap z to nearest road
    const snappedZ = roadPositions.reduce((prev, curr) => 
      Math.abs(curr - z) < Math.abs(prev - z) ? curr : prev
    );
    return [x, snappedZ];
  } else {
    // For vertical movement, snap x to nearest road
    const snappedX = roadPositions.reduce((prev, curr) => 
      Math.abs(curr - x) < Math.abs(prev - x) ? curr : prev
    );
    return [snappedX, z];
  }
};

// Animated cars moving on roads
export const Car = ({ 
  position, 
  direction,
  roadMap,
  carId
}: { 
  position: [number, number, number]; 
  direction: 'x' | 'z';
  roadMap: Set<string>;
  carId: string;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [state, setState] = useState<CarState>('moving');
  const [waitTime, setWaitTime] = useState(0);
  
  // Ensure initial position is on a road, snap if needed
  const initialPosition = useMemo(() => {
    if (isOnRoad(position[0], position[2], roadMap)) {
      return position;
    }
    const [snappedX, snappedZ] = getNearestRoadPosition(position[0], position[2], direction);
    return [snappedX, position[1], snappedZ] as [number, number, number];
  }, [position, direction, roadMap]);
  
  const [currentPosition, setCurrentPosition] = useState<[number, number, number]>(initialPosition);
  
  // Car color based on ID for consistency
  const carColor = useMemo(() => {
    const colors = [
      '#ef4444', // red
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // orange
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange-red
    ];
    const index = parseInt(carId) % colors.length;
    return colors[index];
  }, [carId]);

  const speed = 0.02;
  // Set wait and park durations once per car instance
  const waitDuration = useMemo(() => 60 + Math.random() * 120, []); // Wait 1-3 seconds (60-180 frames at 60fps)
  const parkDuration = useMemo(() => 300 + Math.random() * 300, []); // Park 5-10 seconds

  useFrame(() => {
    if (!groupRef.current) return;
    
    // State machine for car behavior
    if (state === 'parked') {
      // Stay parked for a duration, then start moving
      setWaitTime(prev => {
        if (prev >= parkDuration) {
          setState('moving');
          return 0;
        }
        return prev + 1;
      });
      return;
    }

    if (state === 'waiting') {
      // Wait at traffic light or intersection
      setWaitTime(prev => {
        if (prev >= waitDuration) {
          setState('moving');
          return 0;
        }
        return prev + 1;
      });
      return;
    }

    // Moving state - only move if next position is on a road
    let newX = currentPosition[0];
    let newZ = currentPosition[2];
    
    if (direction === 'x') {
      newX += speed;
      // Wrap around at boundaries
      if (newX > 15) newX = -15;
      if (newX < -15) newX = 15;
    } else {
      newZ += speed;
      // Wrap around at boundaries
      if (newZ > 15) newZ = -15;
      if (newZ < -15) newZ = 15;
    }

    // Only move if the new position is on a road
    if (isOnRoad(newX, newZ, roadMap)) {
      // Valid road position - update
      setCurrentPosition([newX, currentPosition[1], newZ]);
      groupRef.current.position.set(newX, currentPosition[1], newZ);
      
      // Randomly decide to wait (simulate traffic lights, intersections) - reduced frequency
      if (Math.random() < 0.001) { // ~0.1% chance per frame (reduced from 0.3%)
        setState('waiting');
        setWaitTime(0);
      }
      // Randomly park when on road (simulate parking spots) - reduced frequency
      else if (Math.random() < 0.0005) { // 0.05% chance (reduced from 0.1%)
        setState('parked');
        setWaitTime(0);
      }
    } else {
      // Not on road - ensure we're on a road by snapping
      // This handles edge cases where car might drift off road
      const [snappedX, snappedZ] = getNearestRoadPosition(currentPosition[0], currentPosition[2], direction);
      if (!isOnRoad(currentPosition[0], currentPosition[2], roadMap)) {
        // If current position is not on road, snap to road
        setCurrentPosition([snappedX, currentPosition[1], snappedZ]);
        groupRef.current.position.set(snappedX, currentPosition[1], snappedZ);
      }
      // Don't move forward if next position is not on road
    }
  });

  // Car rotation based on direction
  // Car is built with width (x) 0.5 and length (z) 0.8
  // When moving in x direction, car should face x direction (rotate 90 degrees)
  // When moving in z direction, car should face z direction (no rotation)
  const rotation = direction === 'x' ? Math.PI / 2 : 0;

  return (
    <group ref={groupRef} position={currentPosition} rotation={[0, rotation, 0]} castShadow>
      {/* Car Body - Main chassis */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.8]} />
        <meshStandardMaterial color={carColor} />
      </mesh>
      
      {/* Car Roof */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.45, 0.15, 0.6]} />
        <meshStandardMaterial color={carColor} />
      </mesh>
      
      {/* Windshield */}
      <mesh position={[0, 0.3, 0.25]}>
        <boxGeometry args={[0.44, 0.12, 0.05]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
      </mesh>
      
      {/* Rear Window */}
      <mesh position={[0, 0.3, -0.25]}>
        <boxGeometry args={[0.44, 0.12, 0.05]} />
        <meshStandardMaterial color="#2c3e50" transparent opacity={0.7} />
      </mesh>
      
      {/* Side Windows */}
      <mesh position={[0.22, 0.3, 0.1]}>
        <boxGeometry args={[0.02, 0.12, 0.3]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
      </mesh>
      <mesh position={[-0.22, 0.3, 0.1]}>
        <boxGeometry args={[0.02, 0.12, 0.3]} />
        <meshStandardMaterial color="#87ceeb" transparent opacity={0.6} />
      </mesh>
      
      {/* Wheels - Front */}
      <mesh position={[0.3, 0.08, 0.3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.3, 0.08, 0.3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Wheels - Rear */}
      <mesh position={[0.3, 0.08, -0.3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.3, 0.08, -0.3]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Headlights */}
      <mesh position={[0.15, 0.15, 0.42]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.15, 0.15, 0.42]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
};

// Street lights
export const StreetLight = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      {/* Light */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ffeb3b" emissive="#ffeb3b" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0, 1, 0]} intensity={0.5} distance={3} color="#ffeb3b" />
    </group>
  );
};

// Animated people walking
export const Person = ({ position, speed = 0.01 }: { position: [number, number, number]; speed?: number }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.z += speed;
    if (groupRef.current.position.z > 15) groupRef.current.position.z = -15;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
        <meshStandardMaterial color="#2196f3" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffdbac" />
      </mesh>
    </group>
  );
};

// Traffic signals - animated traffic lights at intersections
export const TrafficLight = ({ position, direction = 'north' }: { position: [number, number, number]; direction?: 'north' | 'south' | 'east' | 'west' }) => {
  const [lightState, setLightState] = useState<'red' | 'yellow' | 'green'>('red');
  const frameCount = useRef(0);

  useFrame(() => {
    frameCount.current++;
    // Change lights every 3 seconds (180 frames at 60fps)
    const cycle = Math.floor(frameCount.current / 180) % 3;
    if (cycle === 0) setLightState('red');
    else if (cycle === 1) setLightState('green');
    else setLightState('yellow');
  });

  // Position offset based on direction (at corner of intersection)
  const getOffset = () => {
    switch (direction) {
      case 'north': return [0.4, 0, 0.4];
      case 'south': return [-0.4, 0, -0.4];
      case 'east': return [0.4, 0, -0.4];
      case 'west': return [-0.4, 0, 0.4];
      default: return [0.4, 0, 0.4];
    }
  };

  const offset = getOffset();

  return (
    <group position={[position[0] + offset[0], position[1], position[2] + offset[2]]}>
      {/* Pole */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Traffic light box */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.12, 0.35, 0.12]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Red light */}
      <mesh position={[0, 1.25, 0.07]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial 
          color={lightState === 'red' ? '#ff0000' : '#330000'} 
          emissive={lightState === 'red' ? '#ff0000' : '#000000'}
          emissiveIntensity={lightState === 'red' ? 2 : 0}
        />
      </mesh>
      {/* Yellow light */}
      <mesh position={[0, 1.1, 0.07]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial 
          color={lightState === 'yellow' ? '#ffeb3b' : '#332200'} 
          emissive={lightState === 'yellow' ? '#ffeb3b' : '#000000'}
          emissiveIntensity={lightState === 'yellow' ? 2 : 0}
        />
      </mesh>
      {/* Green light */}
      <mesh position={[0, 0.95, 0.07]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial 
          color={lightState === 'green' ? '#4caf50' : '#003300'} 
          emissive={lightState === 'green' ? '#4caf50' : '#000000'}
          emissiveIntensity={lightState === 'green' ? 2 : 0}
        />
      </mesh>
    </group>
  );
};

// Benches in parks
export const Bench = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.4, 0.05, 0.15]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      <mesh position={[-0.15, 0.05, 0]}>
        <boxGeometry args={[0.05, 0.1, 0.15]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      <mesh position={[0.15, 0.05, 0]}>
        <boxGeometry args={[0.05, 0.1, 0.15]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
    </group>
  );
};

// Flyover/Bridge
export const Flyover = ({ position, length }: { position: [number, number, number]; length: number }) => {
  return (
    <group position={position}>
      {/* Bridge deck */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[length, 0.1, 1]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      {/* Support pillars */}
      {Array.from({ length: Math.floor(length / 2) }).map((_, i) => (
        <mesh key={i} position={[-length/2 + i * 2, 0.75, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.15, 1.5, 8]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
    </group>
  );
};

// Billboard/Sign with image support
const BillboardWithImage = ({ position, imageUrl }: { position: [number, number, number]; imageUrl: string }) => {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  
  useEffect(() => {
    if (texture) {
      texture.flipY = false;
    }
  }, [texture]);

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      {/* Board */}
      <mesh position={[0, 2.3, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1, 0.6, 0.05]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </group>
  );
};

// Billboard/Sign
export const Billboard = ({ position, text, imageUrl }: { position: [number, number, number]; text?: string; imageUrl?: string }) => {
  if (imageUrl) {
    return <BillboardWithImage position={position} imageUrl={imageUrl} />;
  }

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      {/* Board */}
      <mesh position={[0, 2.3, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1, 0.6, 0.05]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
    </group>
  );
};

// Bus stop
export const BusStop = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Shelter */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.6, 0.05, 0.4]} />
        <meshStandardMaterial color="#e3f2fd" transparent opacity={0.7} />
      </mesh>
      {/* Back panel */}
      <mesh position={[0, 0.5, -0.2]}>
        <boxGeometry args={[0.6, 0.6, 0.05]} />
        <meshStandardMaterial color="#1976d2" />
      </mesh>
      {/* Poles */}
      <mesh position={[-0.25, 0.4, -0.15]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh position={[0.25, 0.4, -0.15]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>
    </group>
  );
};

// Fountain (for parks)
export const Fountain = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.2, 16]} />
        <meshStandardMaterial color="#90caf9" />
      </mesh>
      {/* Middle tier */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.15, 16]} />
        <meshStandardMaterial color="#64b5f6" />
      </mesh>
      {/* Top */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.1, 16]} />
        <meshStandardMaterial color="#42a5f5" />
      </mesh>
      {/* Water effect */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.05, 16]} />
        <meshStandardMaterial color="#00bcd4" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};
