import { useRef, useEffect, useState } from 'react';
import { Land } from '@/types/game';
import * as THREE from 'three';

interface MinimapProps {
  lands: Land[];
  camera: THREE.Camera | null;
  size?: number;
  panelOpen?: boolean;
}

export const Minimap = ({ lands, camera, size = 200, panelOpen = false }: MinimapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isTeleportMode, setIsTeleportMode] = useState(false);
  
  // Toggle teleport mode with T key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T') {
        setIsTeleportMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  // Handle click on minimap for teleport
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTeleportMode || !camera) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert canvas coordinates to world coordinates
    const gridSize = 30;
    const cellSize = size / gridSize;
    const worldX = (x / cellSize) - 15;
    const worldZ = (y / cellSize) - 15;
    
    // Clamp to world bounds
    const clampedX = Math.max(-15, Math.min(15, worldX));
    const clampedZ = Math.max(-15, Math.min(15, worldZ));
    
    // Teleport player (only x and z, y will be handled by the teleport function)
    if ((window as any).__teleportPlayer) {
      (window as any).__teleportPlayer(clampedX, clampedZ);
      setIsTeleportMode(false);
    }
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Cache land colors to avoid recalculating
    const getLandColor = (zone: string): string => {
      switch (zone) {
        case 'residential':
          return '#10b981';
        case 'commercial':
          return '#3b82f6';
        case 'industrial':
          return '#f59e0b';
        case 'agricultural':
          return '#84cc16';
        case 'park':
          return '#22c55e';
        case 'road':
          return '#475569';
        default:
          return '#2a2a2a';
      }
    };
    
    const gridSize = 30;
    const cellSize = size / gridSize;
    
    // Draw static elements once (background, grid, lands)
    const drawStatic = () => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size);
      
      // Draw background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, size, size);
      
      // Grid lines removed for cleaner look
      
      // Draw lands
      lands.forEach(land => {
        const x = land.x * cellSize;
        const y = land.y * cellSize;
        const color = getLandColor(land.zone);
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellSize, cellSize);
        
        // Draw buildings (simplified - just a small dot)
        if (land.building && land.building.stage === 'complete') {
          ctx.fillStyle = '#000';
          ctx.fillRect(x + cellSize * 0.3, y + cellSize * 0.3, cellSize * 0.4, cellSize * 0.4);
        }
      });
    };
    
    // Track previous player position to clear it properly
    let prevPlayerX = -1;
    let prevPlayerZ = -1;
    
    // Draw only dynamic elements (player position)
    const drawDynamic = () => {
      if (!camera) return;
      
      // Draw player position
      const playerX = (camera.position.x + 15) * cellSize;
      const playerZ = (camera.position.z + 15) * cellSize;
      
      // Clamp to canvas bounds
      const clampedX = Math.max(3, Math.min(size - 3, playerX));
      const clampedZ = Math.max(3, Math.min(size - 3, playerZ));
      
      // Helper function to redraw a land tile with grid
      const redrawLandTile = (land: typeof lands[0], x: number, y: number) => {
        const color = getLandColor(land.zone);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellSize, cellSize);
        
        // Redraw building if exists
        if (land.building && land.building.stage === 'complete') {
          ctx.fillStyle = '#000';
          ctx.fillRect(x + cellSize * 0.3, y + cellSize * 0.3, cellSize * 0.4, cellSize * 0.4);
        }
        
        // Grid lines removed - no need to redraw them
      };
      
      // Clear previous player marker if position changed
      if (prevPlayerX >= 0 && prevPlayerZ >= 0 && (Math.abs(prevPlayerX - clampedX) > 1 || Math.abs(prevPlayerZ - clampedZ) > 1)) {
        // Clear previous marker area (including direction line)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(prevPlayerX - 10, prevPlayerZ - 10, 20, 20);
        
        // Redraw affected land tiles from previous position
        const affectedLands = lands.filter(land => {
          const landX = land.x * cellSize;
          const landZ = land.y * cellSize;
          return Math.abs(landX - prevPlayerX) < 15 && Math.abs(landZ - prevPlayerZ) < 15;
        });
        
        affectedLands.forEach(land => {
          const x = land.x * cellSize;
          const y = land.y * cellSize;
          redrawLandTile(land, x, y);
        });
      }
      
      // Redraw affected land tiles at current position (only if position changed)
      if (prevPlayerX < 0 || Math.abs(prevPlayerX - clampedX) > 1 || Math.abs(prevPlayerZ - clampedZ) > 1) {
        const affectedLands = lands.filter(land => {
          const landX = land.x * cellSize;
          const landZ = land.y * cellSize;
          return Math.abs(landX - clampedX) < 15 && Math.abs(landZ - clampedZ) < 15;
        });
        
        affectedLands.forEach(land => {
          const x = land.x * cellSize;
          const y = land.y * cellSize;
          redrawLandTile(land, x, y);
        });
      }
      
      // Draw player position (single marker - always redraw)
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(clampedX, clampedZ, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw player direction
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(camera.quaternion);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(clampedX, clampedZ);
      ctx.lineTo(clampedX + direction.x * 5, clampedZ + direction.z * 5);
      ctx.stroke();
      
      // Update previous position
      prevPlayerX = clampedX;
      prevPlayerZ = clampedZ;
    };
    
    // Draw static elements once
    drawStatic();
    
    // Update dynamic elements less frequently
    const interval = setInterval(drawDynamic, 200); // Update 5 times per second instead of 10
    
    return () => {
      clearInterval(interval);
      // Cleanup: clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);
        }
      }
    };
  }, [lands, camera, size]);
  
  if (!camera) return null;
  
  return (
    <div
      className="minimap-container"
      style={{
        position: 'absolute',
        top: '100px',
        right: panelOpen ? '420px' : '20px', // Move left when panel is open
        zIndex: 1000,
        pointerEvents: isTeleportMode ? 'auto' : 'none',
        transition: 'right 0.3s ease-in-out',
      }}
    >
      <div
        style={{
          background: isTeleportMode ? 'rgba(0, 100, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)',
          border: isTeleportMode ? '2px solid #00ff00' : '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          padding: '8px',
        }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onClick={handleCanvasClick}
          style={{
            display: 'block',
            imageRendering: 'pixelated',
            cursor: isTeleportMode ? 'crosshair' : 'default',
          }}
        />
        <div
          style={{
            color: '#fff',
            fontSize: '12px',
            textAlign: 'center',
            marginTop: '4px',
          }}
        >
          {isTeleportMode ? 'Click to Teleport (Press T to cancel)' : 'Minimap (Press T to teleport)'}
        </div>
      </div>
    </div>
  );
};

