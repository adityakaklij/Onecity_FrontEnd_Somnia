import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';

interface AudioSystemProps {
  isMoving: boolean;
  isOnRoad: boolean;
}

export const AudioSystem = ({ isMoving, isOnRoad }: AudioSystemProps) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const footstepsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ambientSourceRef = useRef<OscillatorNode | null>(null);
  const lastFootstepTime = useRef(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Initialize Web Audio API
  useEffect(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      setAudioEnabled(false);
    }
    
    return () => {
      if (footstepsSourceRef.current) {
        footstepsSourceRef.current.stop();
        footstepsSourceRef.current = null;
      }
      if (ambientSourceRef.current) {
        ambientSourceRef.current.stop();
        ambientSourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Ambient wind sound removed - was causing constant humming
  // Can be re-enabled later with better implementation if needed
  
  // Footsteps sound
  useFrame((state, delta) => {
    if (!audioContextRef.current || !audioEnabled || !isMoving) return;
    
    const now = state.clock.elapsedTime;
    const footstepInterval = isOnRoad ? 0.4 : 0.5; // Faster on roads
    
    if (now - lastFootstepTime.current >= footstepInterval) {
      lastFootstepTime.current = now;
      
      // Create footstep sound
      const ctx = audioContextRef.current;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      const frequency = isOnRoad ? 250 : 200;
      for (let i = 0; i < buffer.length; i++) {
        const t = i / ctx.sampleRate;
        data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 15) * 0.1;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      
      footstepsSourceRef.current = source;
    }
  });
  
  return null;
};

// Helper function to generate procedural footstep sounds
export const createFootstepSound = (audioContext: AudioContext, isOnRoad: boolean): AudioBufferSourceNode => {
  const sampleRate = audioContext.sampleRate;
  const duration = 0.1; // 100ms
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  
  // Generate a simple footstep-like sound
  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    // Create a thud-like sound
    const frequency = isOnRoad ? 200 : 150; // Higher pitch on road
    data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 10) * 0.3;
  }
  
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  return source;
};

