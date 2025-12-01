import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Sky } from '@react-three/drei';
import { useMemo, Suspense, useRef, useEffect, useState } from 'react';
import { LandTile } from './LandTile';
import { Land } from '@/types/game';
import { Car, StreetLight, Person, Flyover, Billboard, BusStop } from './CityEnvironment';
import { FirstPersonControls } from './FirstPersonControls';
import { AudioSystem } from './AudioSystem';
import { Crosshair } from './Crosshair';
import * as THREE from 'three';

interface CityCanvasProps {
  lands: Land[];
  selectedLand: Land | null;
  onSelectLand: (land: Land) => void;
  ownedPlotIds?: Set<string>;
}

// Create road map for efficient lookups
const createRoadMap = (lands: Land[]): Set<string> => {
  const roadMap = new Set<string>();
  lands.forEach(land => {
    if (land.zone === 'road') {
      roadMap.add(`${land.x}-${land.y}`);
    }
  });
  return roadMap;
};

// Billboard positions mapped to land IDs
const BILLBOARD_POSITIONS: Array<{ position: [number, number, number]; landId: string }> = [
  { position: [-4, 0, -4], landId: '11-11' },
  { position: [5, 0, 5], landId: '20-20' },
  { position: [-10, 0, 8], landId: '5-23' },
];

export const CityCanvas = ({ lands, selectedLand, onSelectLand, ownedPlotIds = new Set() }: CityCanvasProps) => {
  // Memoize road map to avoid recreating on every render
  const roadMap = useMemo(() => createRoadMap(lands), [lands]);
  
  // Get billboard images from lands - only show if owned or leased
  const billboardImageMap = useMemo(() => {
    const map = new Map<string, string>();
    BILLBOARD_POSITIONS.forEach(({ landId }) => {
      const land = lands.find(l => l.id === landId);
      // Only show ad if there's an image URL and the billboard is owned/leased
      // Check if there's an active advertising listing or if it's leased
      if (land?.advertisingImageUrl && (land.owner === 'player' || land.advertisingListing?.status === 'leased')) {
        map.set(landId, land.advertisingImageUrl);
      }
    });
    return map;
  }, [lands]);
  return (
    <Canvas shadows={false}>
      <PerspectiveCamera makeDefault position={[0, 1.6, 0]} fov={75} />
      
      {/* First Person Controls */}
      <FirstPersonControls 
        lands={lands}
        speed={0.04}
        playerHeight={1.6}
        enableGravity={true}
        enableCollision={true}
        enableCameraBob={true}
        onLandClick={onSelectLand}
      />
      
      {/* Audio System */}
      <AudioSystemWrapper />
      
      {/* Crosshair */}
      <Crosshair />
      
      {/* Camera ref for minimap */}
      <CameraRefSetter />
      
      {/* Atmospheric sky with soft colors */}
      <Sky 
        sunPosition={[100, 20, 100]} 
        turbidity={2}
        rayleigh={1}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      
      {/* Soft ambient lighting */}
      <ambientLight intensity={0.7} color="#e0f2fe" />
      
      {/* Main directional light with warm tone (dawn/sunset) - shadows disabled for performance */}
      <directionalLight 
        position={[50, 50, 50]} 
        intensity={1.0}
        color="#fff4e6"
        castShadow={false}
      />
      
      {/* Hemisphere light for sky/ground color */}
      <hemisphereLight intensity={0.4} groundColor="#a8dadc" color="#e0f2fe" />
      
      {/* Additional fill light for softer shadows */}
      <directionalLight 
        position={[-30, 30, -30]} 
        intensity={0.3}
        color="#bae6fd"
      />

      {lands.map((land) => (
        <LandTile
          key={land.id}
          land={land}
          isSelected={selectedLand?.id === land.id}
          onSelect={onSelectLand}
          lands={lands}
          isOwned={ownedPlotIds.has(land.id)}
        />
      ))}

      {/* Street lights on either side of roads */}
      {[0, 6, 12, 18, 24].map(x => 
        [0, 6, 12, 18, 24].map(z => (
          <group key={`lights-${x}-${z}`}>
            {/* Lights for horizontal roads (x direction) */}
            <StreetLight key={`light-h-left-${x}-${z}`} position={[x - 15 - 0.5, 0, z - 15]} />
          </group>
        ))
      )}

      <Car position={[-15, 0.1, 0]} direction="x" roadMap={roadMap} carId="0" />
      <Car position={[-9, 0.1, 0]} direction="x" roadMap={roadMap} carId="1" />
      <Car position={[-3, 0.1, 0]} direction="x" roadMap={roadMap} carId="2" />
      <Car position={[3, 0.1, 0]} direction="x" roadMap={roadMap} carId="3" />
      <Car position={[9, 0.1, 0]} direction="x" roadMap={roadMap} carId="4" />
      <Car position={[0, 0.1, -12]} direction="z" roadMap={roadMap} carId="5" />
      <Car position={[0, 0.1, -6]} direction="z" roadMap={roadMap} carId="6" />
      <Car position={[0, 0.1, 6]} direction="z" roadMap={roadMap} carId="7" />

      {/* NPCs removed to save memory */}


      <Flyover position={[-6, 0, 0]} length={8} />
      <Flyover position={[6, 0, 0]} length={8} />

      {BILLBOARD_POSITIONS.map(({ position, landId }) => (
        <Suspense key={landId} fallback={null}>
          <Billboard 
            position={position} 
            imageUrl={billboardImageMap.get(landId)}
          />
        </Suspense>
      ))}

      <BusStop position={[-15.5, 0, -8]} />
      <BusStop position={[-9.5, 0, 2]} />
      <BusStop position={[3.5, 0, -10]} />
    </Canvas>
  );
};

// Component to expose camera for minimap
const CameraRefSetter = () => {
  const { camera } = useThree();
  useEffect(() => {
    // Store camera reference globally for minimap access
    (window as any).__gameCamera = camera;
    return () => {
      delete (window as any).__gameCamera;
    };
  }, [camera]);
  return null;
};

// Audio system wrapper
const AudioSystemWrapper = () => {
  const [isMoving, setIsMoving] = useState(false);
  const [isOnRoad, setIsOnRoad] = useState(false);
  
  useEffect(() => {
    const checkMovement = setInterval(() => {
      if ((window as any).__playerIsMoving) {
        setIsMoving((window as any).__playerIsMoving());
      }
      if ((window as any).__playerIsOnRoad) {
        setIsOnRoad((window as any).__playerIsOnRoad());
      }
    }, 100);
    
    return () => clearInterval(checkMovement);
  }, []);
  
  return <AudioSystem isMoving={isMoving} isOnRoad={isOnRoad} />;
};
