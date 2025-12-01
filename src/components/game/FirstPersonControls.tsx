import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Land } from '@/types/game';

interface FirstPersonControlsProps {
  lands: Land[];
  speed?: number;
  playerHeight?: number;
  enableGravity?: boolean;
  enableCollision?: boolean;
  enableCameraBob?: boolean;
  onLandClick?: (land: Land | null) => void;
}

export const FirstPersonControls = ({
  lands,
  speed = 0.1,
  playerHeight = 1.6,
  enableGravity = true,
  enableCollision = true,
  enableCameraBob = true,
  onLandClick,
}: FirstPersonControlsProps) => {
  const { camera, gl, scene } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const rotateLeft = useRef(false);
  const rotateRight = useRef(false);
  const moveUp = useRef(false);
  const moveDown = useRef(false);
  const canJump = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const isMovingRef = useRef(false);
  const isOnRoadRef = useRef(false);
  const cameraHeightOffset = useRef(0); // For up/down movement
  const maxHeightOffset = 2; // Maximum height above base
  const minHeightOffset = -1.5; // Allow going down to ground level (negative = below base height)
  
  // Smooth movement interpolation
  const targetPosition = useRef(new THREE.Vector3());
  const currentPosition = useRef(new THREE.Vector3());
  const targetRotation = useRef(new THREE.Euler());
  const currentRotation = useRef(new THREE.Euler());
  
  // Rotation speed for A/D keys
  const rotationSpeed = useRef(0);
  
  // Expose movement state for audio system and teleport
  useEffect(() => {
    (window as any).__playerIsMoving = () => isMovingRef.current;
    (window as any).__playerIsOnRoad = () => isOnRoadRef.current;
    (window as any).__getPlayerPosition = () => camera.position.clone();
    (window as any).__teleportPlayer = (x: number, z: number) => {
      // Teleport to position, maintaining current height offset
      const groundHeight = 0;
      const targetY = groundHeight + playerHeight + cameraHeightOffset.current;
      targetPosition.current.set(x, targetY, z);
      currentPosition.current.set(x, targetY, z);
      camera.position.set(x, targetY, z);
      baseHeightRef.current = targetY;
      velocity.current.y = 0; // Reset velocity
      canJump.current = true; // Allow jumping after teleport
    };
  }, [camera, playerHeight]);
  const raycaster = useRef(new THREE.Raycaster());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const PI_2 = Math.PI / 2;
  
  // Camera bobbing
  const bobTime = useRef(0);
  const bobAmount = 0.03;
  const bobSpeed = 8;
  const baseHeightRef = useRef(playerHeight);
  
  // Collision detection
  const collisionBoxes = useRef<THREE.Box3[]>([]);
  const playerBox = useRef(new THREE.Box3());
  const playerRadius = 0.3; // Player collision radius
  
  // Road detection for speed
  const roadMap = useRef<Set<string>>(new Set());
  
    // Initialize camera position
  useEffect(() => {
    // Start at a good position (center of city, above ground)
    camera.position.set(0, playerHeight, 0);
    camera.rotation.set(0, 0, 0);
    targetPosition.current.copy(camera.position);
    currentPosition.current.copy(camera.position);
    targetRotation.current.copy(camera.rotation);
    currentRotation.current.copy(camera.rotation);
    
    // Build road map
    roadMap.current = new Set();
    lands.forEach(land => {
      if (land.zone === 'road') {
        roadMap.current.add(`${land.x}-${land.y}`);
      }
    });
    
    // Build collision boxes for buildings
    collisionBoxes.current = [];
    lands.forEach(land => {
      if (land.building && land.building.stage === 'complete' && land.zone !== 'road') {
        const x = land.x - 15;
        const z = land.y - 15;
        const buildingHeight = land.building.floors ? land.building.floors * 0.2 + 1 : 1;
        const box = new THREE.Box3(
          new THREE.Vector3(x - 0.35, 0, z - 0.35),
          new THREE.Vector3(x + 0.35, buildingHeight, z + 0.35)
        );
        collisionBoxes.current.push(box);
      }
    });
    
    // Don't auto-lock pointer - allow free mouse movement for easier selection
    // User can manually lock with a key press if needed
  }, [camera, gl, lands, playerHeight]);
  
  // Handle pointer lock change
  useEffect(() => {
    const handlePointerLockChange = () => {
      if (document.pointerLockElement === gl.domElement) {
        // Pointer is locked
      } else {
        // Pointer is unlocked
      }
    };
    
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [gl]);
  
  // Mouse movement - drag-based rotation for continuous turning
  useEffect(() => {
    let isPointerLocked = false;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let rafId: number | null = null;
    let accumulatedRotationX = 0;
    let accumulatedRotationY = 0;
    
    const processRotation = () => {
      if (accumulatedRotationX !== 0 || accumulatedRotationY !== 0) {
        euler.current.setFromQuaternion(camera.quaternion);
        euler.current.y -= accumulatedRotationY;
        euler.current.x -= accumulatedRotationX;
        euler.current.x = Math.max(-PI_2, Math.min(PI_2, euler.current.x));
        
        targetRotation.current.copy(euler.current);
        
        accumulatedRotationX = 0;
        accumulatedRotationY = 0;
      }
      rafId = null;
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (isPointerLocked) {
        // Pointer locked mode - use relative movement
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        // Accumulate rotation for smoother updates
        accumulatedRotationY += movementX * 0.002;
        accumulatedRotationX += movementY * 0.002;
        
        // Process rotation on next frame
        if (rafId === null) {
          rafId = requestAnimationFrame(processRotation);
        }
      } else if (isDragging) {
        // Drag mode - calculate rotation from mouse movement
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;
        
        // Only process if there's significant movement to avoid jitter
        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          // Accumulate rotation
          accumulatedRotationY += deltaX * 0.003;
          accumulatedRotationX += deltaY * 0.003;
          
          // Process rotation on next frame
          if (rafId === null) {
            rafId = requestAnimationFrame(processRotation);
          }
        }
        
        // Update last position
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && !isPointerLocked) { // Left click - start drag
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        gl.domElement.style.cursor = 'grabbing';
      } else if (e.button === 1) { // Middle mouse button - toggle lock
        e.preventDefault();
        if (!isPointerLocked) {
          gl.domElement.requestPointerLock();
        } else {
          document.exitPointerLock();
        }
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        gl.domElement.style.cursor = 'none';
      }
    };
    
    const handlePointerLockChange = () => {
      isPointerLocked = document.pointerLockElement === gl.domElement;
      if (isPointerLocked) {
        isDragging = false;
        gl.domElement.style.cursor = 'none';
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [camera, gl]);
  
  // Handle clicks for plot selection with raycasting - works with free cursor
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0) return; // Only left click
      if (!onLandClick) return;
      
      // Get mouse position relative to canvas
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Raycast from camera through mouse position
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      raycaster.far = 50; // Limit raycast distance
      
      // Collect all meshes with landId
      const landMeshes: THREE.Mesh[] = [];
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.userData && object.userData.landId) {
          if (object.visible) {
            landMeshes.push(object);
          }
        }
      });
      
      if (landMeshes.length === 0) return;
      
      // Raycast against all land meshes
      const intersects = raycaster.intersectObjects(landMeshes, false);
      
      if (intersects.length > 0) {
        // Get closest intersection
        const closest = intersects[0];
        const landId = closest.object.userData.landId;
        if (landId) {
          const land = lands.find(l => l.id === landId);
          if (land && land.zone !== 'road') {
            onLandClick(land);
          }
        }
      }
    };
    
    gl.domElement.addEventListener('click', handleClick);
    return () => {
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [camera, gl, scene, lands, onLandClick]);
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveForward.current = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          moveBackward.current = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          rotateLeft.current = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          rotateRight.current = true;
          break;
        case 'Space':
          event.preventDefault();
          if (canJump.current) {
            velocity.current.y += 0.15;
            canJump.current = false;
          }
          break;
        case 'KeyQ':
          moveUp.current = true;
          break;
        case 'KeyE':
          moveDown.current = true;
          break;
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveForward.current = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          moveBackward.current = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          rotateLeft.current = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          rotateRight.current = false;
          break;
        case 'KeyQ':
          moveUp.current = false;
          break;
        case 'KeyE':
          moveDown.current = false;
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Check if position is on road
  const isOnRoad = useCallback((x: number, z: number): boolean => {
    const gridX = Math.round(x + 15);
    const gridY = Math.round(z + 15);
    return roadMap.current.has(`${gridX}-${gridY}`);
  }, []);
  
  // Check collision
  const checkCollision = useCallback((newPosition: THREE.Vector3): boolean => {
    if (!enableCollision) return false;
    
    playerBox.current.setFromCenterAndSize(
      new THREE.Vector3(newPosition.x, newPosition.y + playerHeight / 2, newPosition.z),
      new THREE.Vector3(playerRadius * 2, playerHeight, playerRadius * 2)
    );
    
    for (const box of collisionBoxes.current) {
      if (playerBox.current.intersectsBox(box)) {
        return true;
      }
    }
    return false;
  }, [enableCollision, playerHeight]);
  
  // Raycast to ground for gravity
  const getGroundHeight = useCallback((x: number, z: number): number => {
    // Simple ground height (can be enhanced with terrain)
    return 0;
  }, []);
  
  useFrame((state, delta) => {
    // Handle rotation from A/D keys
    const rotationAmount = 2.0; // Rotation speed in radians per second
    if (rotateLeft.current) {
      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y += rotationAmount * delta;
      targetRotation.current.copy(euler.current);
    }
    if (rotateRight.current) {
      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= rotationAmount * delta;
      targetRotation.current.copy(euler.current);
    }
    
    // Smooth rotation interpolation with better frame-rate handling
    const rotLerpFactor = Math.min(1, delta * 15); // Reduced from 20 for smoother interpolation
    const deltaX = targetRotation.current.x - currentRotation.current.x;
    const deltaY = targetRotation.current.y - currentRotation.current.y;
    
    // Normalize angle differences to prevent jitter
    let normalizedDeltaY = deltaY;
    if (normalizedDeltaY > Math.PI) normalizedDeltaY -= 2 * Math.PI;
    if (normalizedDeltaY < -Math.PI) normalizedDeltaY += 2 * Math.PI;
    
    currentRotation.current.x += deltaX * rotLerpFactor;
    currentRotation.current.y += normalizedDeltaY * rotLerpFactor;
    camera.quaternion.setFromEuler(currentRotation.current);
    
    // Calculate movement direction (only forward/backward now)
    direction.current.set(0, 0, 0);
    
    if (moveForward.current) direction.current.z -= 1;
    if (moveBackward.current) direction.current.z += 1;
    
    direction.current.normalize();
    direction.current.applyQuaternion(camera.quaternion);
    direction.current.y = 0; // Keep movement horizontal
    
    // Check if on road for speed adjustment
    const onRoad = isOnRoad(camera.position.x, camera.position.z);
    isOnRoadRef.current = onRoad;
    // Increased forward/backward speed (2x faster)
    const baseSpeed = speed * 2.0; // Double the speed
    const currentSpeed = onRoad ? baseSpeed : baseSpeed * 0.5;
    
    // Check if moving
    isMovingRef.current = moveForward.current || moveBackward.current;
    
    // Apply movement with smooth interpolation
    const moveVector = direction.current.multiplyScalar(currentSpeed * delta * 60); // Frame-rate independent
    targetPosition.current.copy(camera.position).add(moveVector);
    
    // Check collision before moving
    if (!checkCollision(targetPosition.current)) {
      // Smooth position interpolation (lerp factor adjusted for smoothness)
      const lerpFactor = Math.min(1, delta * 15); // Smooth interpolation
      currentPosition.current.lerp(targetPosition.current, lerpFactor);
      camera.position.x = currentPosition.current.x;
      camera.position.z = currentPosition.current.z;
    } else {
      // If collision, keep current position
      targetPosition.current.copy(camera.position);
      currentPosition.current.copy(camera.position);
    }
    
    // Up/Down movement (Q/E keys)
    const upDownSpeed = 0.05;
    if (moveUp.current) {
      cameraHeightOffset.current = Math.min(maxHeightOffset, cameraHeightOffset.current + upDownSpeed);
    }
    if (moveDown.current) {
      cameraHeightOffset.current = Math.max(minHeightOffset, cameraHeightOffset.current - upDownSpeed);
    }
    
    // Gravity
    if (enableGravity) {
      velocity.current.y -= 0.01; // Gravity
      
      const groundHeight = getGroundHeight(camera.position.x, camera.position.z);
      const targetY = groundHeight + playerHeight + cameraHeightOffset.current;
      baseHeightRef.current = targetY;
      
      if (camera.position.y <= targetY && velocity.current.y <= 0) {
        camera.position.y = targetY;
        velocity.current.y = 0;
        canJump.current = true;
      } else {
        camera.position.y += velocity.current.y;
      }
    } else {
      baseHeightRef.current = playerHeight + cameraHeightOffset.current;
      camera.position.y = baseHeightRef.current;
    }
    
    // Camera bobbing (oscillate around base height, only when moving)
    if (enableCameraBob && (moveForward.current || moveBackward.current)) {
      bobTime.current += delta * bobSpeed;
      const bobOffset = Math.sin(bobTime.current) * bobAmount;
      camera.position.y = baseHeightRef.current + bobOffset;
    } else {
      // Reset bobbing when not moving
      bobTime.current = 0;
      if (!enableGravity || canJump.current) {
        camera.position.y = baseHeightRef.current;
      }
    }
    
    // Clamp position to world bounds
    const worldSize = 15;
    camera.position.x = Math.max(-worldSize, Math.min(worldSize, camera.position.x));
    camera.position.z = Math.max(-worldSize, Math.min(worldSize, camera.position.z));
  });
  
  return null;
};

