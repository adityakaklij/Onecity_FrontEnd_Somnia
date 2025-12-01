---
inclusion: fileMatch
fileMatchPattern: '**/components/game/**'
---

# 3D Graphics Guidelines

## Three.js + React Three Fiber

### Component Structure
Use React Three Fiber's declarative approach:
```typescript
<Canvas>
  <ambientLight intensity={0.5} />
  <pointLight position={[10, 10, 10]} />
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="blue" />
  </mesh>
</Canvas>
```

## Performance Optimization

### 1. Geometry Reuse
- Create geometries once and reuse them
- Use `useMemo` for expensive calculations
- Share materials across similar objects

### 2. Level of Detail (LOD)
- Reduce polygon count for distant objects
- Use simpler materials for background elements
- Implement frustum culling

### 3. Rendering Optimization
```typescript
<Canvas
  gl={{ antialias: true, alpha: false }}
  dpr={[1, 2]} // Device pixel ratio
  performance={{ min: 0.5 }} // Adaptive performance
>
```

## First-Person Controls

### Camera Setup
- Position camera at player eye level
- Implement smooth movement with lerping
- Add collision detection with land boundaries

### Input Handling
- WASD for movement
- Mouse for looking around
- Click for interaction with land tiles

## Land Tile Rendering

### Tile States
- **Unowned**: Default appearance
- **Owned by User**: Highlighted border
- **Owned by Others**: Different color
- **Hovered**: Glow effect
- **Selected**: Strong highlight

### Zone-Specific Styling
Apply different colors/materials based on zone type:
- Residential: Green tones
- Commercial: Blue tones
- Industrial: Orange tones
- Agricultural: Lime tones

## Minimap Implementation
- Render top-down view of city
- Show player position
- Highlight owned properties
- Update in real-time

## Best Practices
- Keep draw calls minimal
- Batch similar objects
- Use instanced meshes for repeated elements
- Dispose of geometries and materials when unmounting
- Test performance on lower-end devices
- Implement loading states for 3D assets
