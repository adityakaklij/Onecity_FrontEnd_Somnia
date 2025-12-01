import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export const Crosshair = () => {
  const { gl } = useThree();
  
  useEffect(() => {
    // Always show crosshair for easier selection (free cursor mode)
    gl.domElement.style.cursor = 'none';
    
    // Create crosshair element
    let crosshair = document.getElementById('game-crosshair');
    if (!crosshair) {
      crosshair = document.createElement('div');
      crosshair.id = 'game-crosshair';
      crosshair.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        pointer-events: none;
        z-index: 999;
      `;
      crosshair.innerHTML = `
        <div style="position: absolute; top: 50%; left: 0; width: 8px; height: 2px; background: rgba(255, 255, 255, 0.8); transform: translateY(-50%);"></div>
        <div style="position: absolute; top: 50%; right: 0; width: 8px; height: 2px; background: rgba(255, 255, 255, 0.8); transform: translateY(-50%);"></div>
        <div style="position: absolute; left: 50%; top: 0; width: 2px; height: 8px; background: rgba(255, 255, 255, 0.8); transform: translateX(-50%);"></div>
        <div style="position: absolute; left: 50%; bottom: 0; width: 2px; height: 8px; background: rgba(255, 255, 255, 0.8); transform: translateX(-50%);"></div>
        <div style="position: absolute; top: 50%; left: 50%; width: 2px; height: 2px; background: rgba(255, 255, 255, 0.8); transform: translate(-50%, -50%); border-radius: 50%;"></div>
      `;
      document.body.appendChild(crosshair);
    }
    crosshair.style.display = 'block';
    
    // Update crosshair position to follow mouse
    const handleMouseMove = (e: MouseEvent) => {
      if (crosshair && document.pointerLockElement !== gl.domElement) {
        crosshair.style.left = e.clientX + 'px';
        crosshair.style.top = e.clientY + 'px';
        crosshair.style.transform = 'translate(-50%, -50%)';
      } else if (crosshair && document.pointerLockElement === gl.domElement) {
        // Center when locked
        crosshair.style.left = '50%';
        crosshair.style.top = '50%';
        crosshair.style.transform = 'translate(-50%, -50%)';
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      gl.domElement.style.cursor = 'default';
      document.removeEventListener('mousemove', handleMouseMove);
      const crosshair = document.getElementById('game-crosshair');
      if (crosshair) {
        crosshair.remove();
      }
    };
  }, [gl]);
  
  return null;
};

