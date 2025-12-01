# City Builder Game - Complete Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Rendering Pipeline](#rendering-pipeline)
4. [Core Components](#core-components)
5. [Game Systems](#game-systems)
6. [Development Tools & Libraries](#development-tools--libraries)
7. [Making Changes](#making-changes)
8. [Optimization Guide](#optimization-guide)
9. [Update Procedures](#update-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

This is a 3D city builder game built with React and Three.js, featuring:
- **First-person 3D exploration** of a procedurally generated city
- **Land purchasing and development** system
- **Real-time 3D rendering** of buildings, roads, and city elements
- **Interactive UI panels** for land management
- **Minimap** with teleportation functionality
- **Audio system** with procedural sound generation
- **Database integration** for persistent game state

### Project Structure
```
src/
├── components/
│   ├── game/           # Core game components
│   │   ├── CityCanvas.tsx          # Main 3D canvas wrapper
│   │   ├── LandTile.tsx            # Individual land plot rendering
│   │   ├── CityEnvironment.tsx     # Cars, lights, billboards, etc.
│   │   ├── FirstPersonControls.tsx # Player movement & camera
│   │   ├── Minimap.tsx             # Top-down minimap view
│   │   ├── AudioSystem.tsx         # Procedural audio generation
│   │   ├── Crosshair.tsx           # UI crosshair overlay
│   │   ├── GameHeader.tsx          # Top UI bar
│   │   └── LandPanel.tsx           # Side panel for land actions
│   └── ui/             # shadcn/ui components
├── pages/
│   ├── Index.tsx       # Main game page
│   ├── Marketplace.tsx # Marketplace page
│   └── Voting.tsx      # Voting page
├── lib/                # Service modules (database, blockchain)
├── types/
│   └── game.ts         # TypeScript type definitions
└── config/
    └── pricing.ts      # Game pricing configuration
```

---

## Architecture & Tech Stack

### Core Technologies

#### **Frontend Framework**
- **React 18.3.1** - UI framework
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool and dev server

#### **3D Rendering**
- **Three.js 0.160.1** - 3D graphics library
- **@react-three/fiber 8.18.0** - React renderer for Three.js
- **@react-three/drei 9.122.0** - Useful helpers for R3F

#### **UI Framework**
- **Tailwind CSS 3.4.17** - Utility-first CSS
- **shadcn/ui** - Component library (Radix UI primitives)
- **Radix UI** - Accessible component primitives

#### **State Management**
- **React Hooks** - useState, useEffect, useMemo, useCallback
- **@tanstack/react-query 5.90.9** - Server state management

#### **Routing**
- **react-router-dom 6.30.1** - Client-side routing

#### **Database**
- **Supabase 2.80.0** - PostgreSQL database with real-time features

#### **Blockchain** (Not covered in this doc)
- **@mysten/dapp-kit** - OneChain blockchain integration
- **@onelabs/dapp-kit** - OneWallet integration

### Build Configuration

**Vite Config** (`vite.config.ts`):
- React SWC plugin for fast compilation
- Path alias `@/` → `./src/`
- Development server on port 8080
- Component tagger for development mode

**TypeScript Config**:
- Strict mode enabled
- Path aliases configured
- React JSX support

---

## Rendering Pipeline

### Overview

The game uses a **declarative 3D rendering approach** through React Three Fiber, which translates React components into Three.js objects.

### Rendering Flow

```
1. App.tsx
   └── Routes
       └── Index.tsx (Main Game Page)
           ├── GameHeader (UI)
           ├── Minimap (2D Canvas Overlay)
           └── CityCanvas (3D Scene)
               ├── FirstPersonControls (Camera & Movement)
               ├── AudioSystem (Procedural Audio)
               ├── Crosshair (UI Overlay)
               ├── Sky (Atmospheric Skybox)
               ├── Lighting (Ambient, Directional, Hemisphere)
               ├── LandTile[] (900 tiles - 30x30 grid)
               ├── CityEnvironment (Cars, Lights, Billboards)
               └── CameraRefSetter (Exposes camera to window)
```

### 3D Scene Setup

**CityCanvas.tsx** is the root of the 3D scene:

```typescript
<Canvas shadows={false}>
  <PerspectiveCamera makeDefault position={[0, 1.6, 0]} fov={75} />
  {/* ... scene content ... */}
</Canvas>
```

**Key Rendering Decisions:**
- **Shadows disabled** (`shadows={false}`) for performance
- **FOV 75** - Standard first-person field of view
- **Camera height 1.6** - Average human eye height

### Land Tile Rendering

**LandTile.tsx** renders each plot:

1. **Ground Plane**: Procedurally generated texture based on zone type
2. **Building**: 3D mesh if building exists
3. **Decorative Elements**: Trees, fences, crops based on zone/building
4. **Interactive Elements**: Hover effects, selection indicators

**Texture Generation:**
- Textures are **cached** to avoid recreation
- Canvas-based procedural generation
- Patterns: solid, grid (roads), grass (parks), concrete (commercial)

**Performance Optimizations:**
- `memo()` wrapper to prevent unnecessary re-renders
- Texture caching with `Map<string, THREE.Texture>`
- Reduced texture size (128x128 instead of 256x256)
- Simplified geometry (fewer polygons)

### Lighting System

**Multi-light setup** for realistic appearance:

```typescript
<ambientLight intensity={0.7} color="#e0f2fe" />        // Base illumination
<directionalLight position={[50, 50, 50]} intensity={1.0} />  // Main sun
<hemisphereLight intensity={0.4} />                     // Sky/ground color
<directionalLight position={[-30, 30, -30]} intensity={0.3} /> // Fill light
```

**Lighting Strategy:**
- **Ambient**: Provides base visibility (prevents pure black shadows)
- **Directional (Main)**: Simulates sun with warm tone
- **Hemisphere**: Adds sky/ground color tint
- **Fill Light**: Softens shadows from opposite direction

### Camera System

**FirstPersonControls.tsx** manages:
- **Movement**: WASD keys, smooth interpolation
- **Rotation**: Mouse drag or pointer lock
- **Gravity**: Y-axis physics simulation
- **Collision**: Building collision detection
- **Road Detection**: Speed adjustment on roads

**Camera Features:**
- Smooth position interpolation (lerp)
- Camera bobbing when moving
- Height adjustment (Q/E keys)
- Jump mechanics (Space bar)
- Pointer lock support (Middle mouse)

---

## Core Components

### 1. CityCanvas.tsx

**Purpose**: Root 3D scene container

**Key Responsibilities:**
- Wraps Three.js Canvas
- Sets up camera and lighting
- Renders all land tiles
- Manages city environment (cars, lights, billboards)
- Exposes camera reference for minimap

**Props:**
```typescript
interface CityCanvasProps {
  lands: Land[];              // Array of all land plots
  selectedLand: Land | null;  // Currently selected plot
  onSelectLand: (land: Land) => void;  // Selection callback
  ownedPlotIds?: Set<string>; // Set of owned plot IDs
}
```

**Key Features:**
- Road map memoization for efficient lookups
- Billboard image mapping from land data
- Suspense boundaries for async billboard loading

### 2. LandTile.tsx

**Purpose**: Renders individual land plots

**Key Responsibilities:**
- Ground plane with zone-based textures
- Building 3D models
- Interactive hover/selection states
- Zone-specific decorations (trees, fences, crops)
- Road lane markings

**Performance Optimizations:**
- `memo()` wrapper
- Texture caching
- Conditional rendering (only render when visible)
- Simplified geometry for trees/buildings

**Building Rendering:**
- Height based on floors and development stage
- Color coding by building type
- Windows only for tall buildings (5+ floors)
- Construction stage visualization

### 3. FirstPersonControls.tsx

**Purpose**: First-person camera and movement controller

**Key Features:**
- **Movement**: WASD, smooth interpolation
- **Rotation**: Mouse drag or pointer lock
- **Gravity**: Physics-based Y-axis movement
- **Collision**: Box3-based building collision
- **Road Detection**: Speed multiplier on roads
- **Teleportation**: Global function for minimap teleport

**Movement System:**
```typescript
// Speed adjustment based on terrain
const currentSpeed = onRoad ? speed : speed * 0.5;

// Smooth interpolation
const lerpFactor = Math.min(1, delta * 15);
currentPosition.current.lerp(targetPosition.current, lerpFactor);
```

**Collision Detection:**
- Pre-computed collision boxes for all buildings
- Player represented as Box3
- Collision check before position update

### 4. CityEnvironment.tsx

**Purpose**: Dynamic city elements

**Components:**
- **Car**: Animated vehicles on roads
  - State machine: moving, waiting, parked
  - Road-following AI
  - Color-coded by ID
- **StreetLight**: Illuminated street lights
- **Billboard**: Advertising displays with image support
- **BusStop**: Public transport stops
- **Flyover**: Bridge structures
- **Fountain/Bench**: Park decorations

**Car AI:**
- Follows road network
- Random parking/waiting behavior
- Wraps around at boundaries
- Speed: 0.02 units per frame

### 5. Minimap.tsx

**Purpose**: Top-down 2D map overlay

**Features:**
- Canvas-based rendering
- Real-time player position tracking
- Zone color coding
- Building indicators
- Teleportation mode (T key)

**Rendering Strategy:**
- Static elements drawn once (background, lands)
- Dynamic elements updated at 5 FPS (player position)
- Efficient redraw using dirty rectangle technique

**Teleportation:**
- Press T to enable teleport mode
- Click on minimap to teleport
- Maintains camera height offset

### 6. AudioSystem.tsx

**Purpose**: Procedural audio generation

**Features:**
- Web Audio API integration
- Procedural footstep sounds
- Road vs. off-road sound differentiation
- Frame-based audio generation

**Audio Generation:**
```typescript
// Procedural footstep sound
const frequency = isOnRoad ? 250 : 200;
data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 15) * 0.1;
```

**Performance:**
- Audio generated on-demand
- No pre-loaded audio files
- Minimal CPU usage

### 7. Index.tsx (Main Game Page)

**Purpose**: Game state management and orchestration

**Key Responsibilities:**
- Land data management
- Player state
- Database synchronization
- Transaction handling
- UI state (panel open/closed, instructions)

**State Management:**
- `lands`: Array of all land plots
- `selectedLand`: Currently selected plot
- `player`: Player data (balance, owned lands)
- `ownedPlotIds`: Set for fast ownership checks
- `totalRTokens`: Total RTOKEN balance

**Data Flow:**
1. Load game state from database on mount
2. Sync with blockchain for ownership
3. Auto-save on changes (debounced)
4. Update UI reactively

---

## Game Systems

### Land Generation

**Initial Generation** (`generateInitialLands()` in Index.tsx):
- 30x30 grid (900 plots)
- Zone distribution:
  - Roads: Every 6 blocks (grid pattern)
  - Parks: Central and corners
  - Industrial: North section
  - Commercial: City center (10-20, 10-20)
  - Agricultural: Outskirts
  - Residential: Remaining areas

**Zone Colors:**
- Residential: `#10b981` (green)
- Commercial: `#3b82f6` (blue)
- Industrial: `#f59e0b` (orange)
- Agricultural: `#84cc16` (lime)
- Park: `#22c55e` (emerald)
- Road: `#475569` (slate)

### Building System

**Building Types:**
- Residential: house, apartment, skyscraper
- Commercial: shop, mall, office
- Industrial: factory, warehouse, powerplant
- Agricultural: farm, greenhouse, silo

**Development Stages:**
1. **empty**: No building
2. **foundation**: Construction started (0.1 height)
3. **construction**: Building in progress (0.5 height, 70% opacity)
4. **complete**: Finished building (full height)

**Building Rendering:**
- Height = `floorHeight * floors`
- Color by type
- Windows only for 5+ floor buildings
- Roof on top

### Pricing System

**Configuration** (`config/pricing.ts`):
- Land: Fixed 0.1 OCT per plot
- Permits: 500 RTOKENs
- Contractors: Basic ($10k), Premium ($25k), Luxury ($50k)
- Crops: $2,000 planting cost

**Revenue:**
- Base: $20,000
- Per floor: +$5,000
- Quality multiplier from contractor

### Database Schema

**Tables** (Supabase):
- `plots`: Land ownership and blockchain data
- `permits`: Permit applications and voting
- `listings`: Marketplace listings
- `billboard_advertising`: Billboard advertising listings

**Key Fields:**
- `land_id`: Grid coordinate ID (e.g., "15-20")
- `land_data_object_id`: Blockchain object ID
- `owner_wallet_address`: Owner's wallet
- `rtokens`: RTOKEN balance
- `transaction_digest`: Transaction hash

---

## Development Tools & Libraries

### Build Tools

**Vite**:
- Fast HMR (Hot Module Replacement)
- ES modules in development
- Optimized production builds
- Plugin system

**TypeScript**:
- Type safety
- IntelliSense support
- Compile-time error checking

### UI Libraries

**shadcn/ui**:
- Copy-paste component library
- Built on Radix UI
- Tailwind CSS styling
- Fully customizable

**Radix UI Primitives**:
- Accessible components
- Unstyled by default
- Keyboard navigation
- Screen reader support

### 3D Libraries

**Three.js**:
- Core 3D graphics engine
- Geometry, materials, lights
- Math utilities (Vector3, Matrix4, etc.)

**React Three Fiber**:
- React renderer for Three.js
- Declarative 3D scene graph
- Hooks for Three.js objects
- Automatic cleanup

**Drei**:
- Useful helpers for R3F
- `<Sky>` component
- `<Html>` for 3D HTML overlays
- `<PerspectiveCamera>` helper

### Development Utilities

**ESLint**:
- Code quality checks
- React hooks rules
- TypeScript rules

**PostCSS**:
- CSS processing
- Autoprefixer
- Tailwind CSS compilation

---

## Making Changes

### Adding a New Building Type

1. **Update Types** (`src/types/game.ts`):
```typescript
export type BuildingType = 
  | 'house' | 'apartment' | 'skyscraper'
  | 'shop' | 'mall' | 'office'
  | 'factory' | 'warehouse' | 'powerplant'
  | 'farm' | 'greenhouse' | 'silo'
  | 'newBuildingType'  // Add here
  | null;
```

2. **Update Building Colors** (`src/components/game/LandTile.tsx`):
```typescript
const getBuildingColor = () => {
  // ... existing cases
  case 'newBuildingType':
    return '#yourColor';
  default:
    return '#9E9E9E';
};
```

3. **Update Building Logic** (if needed):
- Add to zone restrictions
- Update pricing if needed
- Add special rendering if needed

### Changing Grid Size

1. **Update Constant** (`src/pages/Index.tsx`):
```typescript
const GRID_SIZE = 30; // Change to desired size
```

2. **Update Generation Function**:
- Modify `generateInitialLands()` loop
- Adjust zone distribution logic

3. **Update Minimap** (`src/components/game/Minimap.tsx`):
```typescript
const gridSize = 30; // Match GRID_SIZE
```

4. **Update Camera Bounds** (`src/components/game/FirstPersonControls.tsx`):
```typescript
const worldSize = 15; // Adjust based on grid size
```

### Adding New Zone Type

1. **Update Types** (`src/types/game.ts`):
```typescript
export type ZoneType = 
  | 'residential' | 'commercial' | 'industrial' 
  | 'agricultural' | 'park' | 'road'
  | 'newZone';  // Add here
```

2. **Update Colors** (`src/components/game/LandTile.tsx`):
```typescript
const tileColor = useMemo(() => {
  const colors = {
    // ... existing
    newZone: '#yourColor',
  };
  return colors[land.zone];
}, [land.zone]);
```

3. **Update Minimap Colors** (`src/components/game/Minimap.tsx`):
```typescript
const getLandColor = (zone: string): string => {
  switch (zone) {
    // ... existing
    case 'newZone':
      return '#yourColor';
  }
};
```

4. **Update Generation Logic** (`src/pages/Index.tsx`):
- Add zone assignment in `generateInitialLands()`

### Modifying Movement Speed

**In FirstPersonControls.tsx**:
```typescript
// Default speed prop
speed = 0.1  // Change default

// Or adjust road multiplier
const currentSpeed = onRoad ? speed : speed * 0.5;  // Change 0.5
```

### Changing Camera Settings

**In CityCanvas.tsx**:
```typescript
<PerspectiveCamera 
  makeDefault 
  position={[0, 1.6, 0]}  // [x, y, z] starting position
  fov={75}                 // Field of view (degrees)
/>
```

**In FirstPersonControls.tsx**:
```typescript
playerHeight = 1.6  // Camera height above ground
```

### Adding New City Element

1. **Create Component** (`src/components/game/CityEnvironment.tsx`):
```typescript
export const NewElement = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* Your 3D geometry */}
    </group>
  );
};
```

2. **Add to CityCanvas**:
```typescript
<NewElement position={[x, y, z]} />
```

### Modifying Lighting

**In CityCanvas.tsx**:
```typescript
// Adjust ambient light
<ambientLight intensity={0.7} color="#e0f2fe" />

// Adjust main directional light
<directionalLight 
  position={[50, 50, 50]}  // Sun position
  intensity={1.0}          // Brightness
  color="#fff4e6"          // Warm tone
/>
```

### Changing Texture Patterns

**In LandTile.tsx** - `createTexture()` function:
```typescript
if (pattern === 'yourPattern') {
  // Add your texture generation logic
  for (let i = 0; i < 100; i++) {
    // Draw pattern
  }
}
```

---

## Optimization Guide

### Current Optimizations

1. **Texture Caching**: Textures cached in `Map` to avoid recreation
2. **Memoization**: `LandTile` wrapped in `memo()`
3. **Reduced Texture Size**: 128x128 instead of 256x256
4. **Simplified Geometry**: Fewer polygons for trees/buildings
5. **Conditional Rendering**: Only render visible elements
6. **Minimap Update Rate**: 5 FPS instead of 60 FPS
7. **Shadows Disabled**: Major performance gain
8. **Road Map Caching**: Pre-computed Set for fast lookups

### Performance Bottlenecks

**Potential Issues:**
1. **900 Land Tiles**: Large number of React components
2. **Texture Generation**: Canvas operations can be slow
3. **Car Updates**: 8 cars updating every frame
4. **Minimap Redraws**: Canvas operations

### Optimization Strategies

#### 1. Reduce Land Tile Count

**Option A: LOD (Level of Detail)**
```typescript
// Only render detailed tiles near camera
const distance = camera.position.distanceTo(tilePosition);
if (distance > 20) {
  // Render simplified version
}
```

**Option B: Frustum Culling**
```typescript
// Only render tiles in camera view
const frustum = new THREE.Frustum();
frustum.setFromProjectionMatrix(camera.projectionMatrix);
if (frustum.containsPoint(tilePosition)) {
  // Render
}
```

#### 2. Optimize Texture Generation

**Pre-generate Textures:**
```typescript
// Generate all textures once at startup
const textures = {
  residential: createTexture('#10b981', 'grass'),
  commercial: createTexture('#3b82f6', 'concrete'),
  // ... etc
};
```

#### 3. Reduce Car Count

**In CityCanvas.tsx**:
```typescript
// Reduce from 8 to 4 cars
<Car position={[-15, 0.1, 0]} direction="x" roadMap={roadMap} carId="0" />
<Car position={[-9, 0.1, 0]} direction="x" roadMap={roadMap} carId="1" />
// Remove others
```

#### 4. Optimize Minimap

**Reduce Update Frequency:**
```typescript
// In Minimap.tsx
const interval = setInterval(drawDynamic, 500); // 2 FPS instead of 5
```

**Use Offscreen Canvas:**
```typescript
// Render to offscreen canvas, then copy to visible canvas
const offscreenCanvas = new OffscreenCanvas(size, size);
```

#### 5. Instance Rendering

**For Repeated Elements (Trees, Fences):**
```typescript
// Use InstancedMesh instead of individual meshes
const treeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 4);
const treeMaterial = new THREE.MeshStandardMaterial({ color: '#228b22' });
const trees = new THREE.InstancedMesh(treeGeometry, treeMaterial, treeCount);

// Set positions
trees.setMatrixAt(i, matrix);
```

#### 6. Geometry Pooling

**Reuse Geometry Objects:**
```typescript
// Create once, reuse
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const sphereGeometry = new THREE.SphereGeometry(0.5);

// Use in multiple meshes
<mesh geometry={boxGeometry} />
```

#### 7. Reduce Re-renders

**Use React.memo More Aggressively:**
```typescript
export const LandTile = memo(({ land, ... }) => {
  // Component
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.land.id === nextProps.land.id &&
         prevProps.isSelected === nextProps.isSelected;
});
```

#### 8. Web Workers for Heavy Calculations

**Move Texture Generation to Worker:**
```typescript
// textureWorker.ts
self.onmessage = (e) => {
  const { color, pattern } = e.data;
  const texture = createTexture(color, pattern);
  self.postMessage(texture);
};
```

### Memory Optimization

**Cleanup Textures:**
```typescript
// Dispose textures when not needed
texture.dispose();
material.dispose();
geometry.dispose();
```

**Limit Cache Size:**
```typescript
// Limit texture cache to 50 entries
if (textureCache.size > 50) {
  const firstKey = textureCache.keys().next().value;
  textureCache.delete(firstKey);
}
```

### Rendering Optimization

**Reduce Draw Calls:**
- Combine meshes where possible
- Use texture atlases
- Batch similar materials

**Reduce Overdraw:**
- Use occlusion culling
- Sort transparent objects back-to-front
- Use depth testing

---

## Update Procedures

### Updating Dependencies

**1. Check for Updates:**
```bash
npm outdated
```

**2. Update Specific Package:**
```bash
npm install package-name@latest
```

**3. Update All Packages (Careful!):**
```bash
npm update
```

**4. Test After Update:**
- Run dev server
- Check for breaking changes
- Test 3D rendering
- Test UI components

### Major Version Updates

#### React 18 → 19 (Future)
- Check React migration guide
- Update React Three Fiber if needed
- Test all hooks and effects

#### Three.js Updates
- Check migration guide
- Update React Three Fiber to compatible version
- Test rendering pipeline

#### Vite Updates
- Usually safe
- Check plugin compatibility
- Test build process

### Adding New Features

**Step-by-Step Process:**

1. **Plan the Feature**
   - Define requirements
   - Identify affected components
   - Plan data flow

2. **Update Types First**
   - Add to `types/game.ts`
   - Ensure type safety

3. **Implement Core Logic**
   - Add to appropriate component
   - Follow existing patterns

4. **Update UI**
   - Add to LandPanel if needed
   - Update GameHeader if needed

5. **Test Thoroughly**
   - Test in development
   - Test edge cases
   - Test performance impact

6. **Optimize if Needed**
   - Profile performance
   - Apply optimizations
   - Re-test

### Database Schema Changes

**If Adding New Tables/Columns:**

1. **Create Migration** (`supabase/migrations/`):
```sql
-- 005_add_new_table.sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  land_id TEXT NOT NULL,
  -- ... other columns
);
```

2. **Update TypeScript Types**:
```typescript
// In database.ts or types file
export interface NewTableRow {
  id: string;
  land_id: string;
  // ... other fields
}
```

3. **Update Service Functions**:
```typescript
// In lib/database.ts
export const saveNewData = async (data: NewTableRow) => {
  // Implementation
};
```

4. **Run Migration**:
```bash
# Via Supabase CLI or dashboard
supabase migration up
```

### UI/UX Updates

**Changing Colors:**
- Update `tailwind.config.ts` for theme colors
- Update component-specific colors in component files
- Update zone colors in `LandTile.tsx` and `Minimap.tsx`

**Changing Layout:**
- Modify component structure
- Update Tailwind classes
- Test responsive behavior

**Adding Animations:**
- Use CSS transitions (Tailwind)
- Use Framer Motion if complex
- Use Three.js animations for 3D

---

## Troubleshooting

### Common Issues

#### 1. Performance Issues

**Symptoms:**
- Low FPS
- Stuttering
- High CPU usage

**Solutions:**
- Reduce number of land tiles rendered
- Disable shadows (already done)
- Reduce car count
- Lower texture resolution
- Enable frustum culling
- Reduce minimap update rate

#### 2. Memory Leaks

**Symptoms:**
- Memory usage increases over time
- Browser becomes slow

**Solutions:**
- Check for missing cleanup in useEffect
- Dispose Three.js objects (textures, geometries)
- Clear intervals/timeouts
- Remove event listeners

**Example Fix:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);
  
  return () => {
    clearInterval(interval); // Always cleanup!
  };
}, []);
```

#### 3. Texture Not Loading

**Symptoms:**
- White/missing textures
- Console errors

**Solutions:**
- Check texture cache
- Verify texture creation logic
- Check CORS if loading external images
- Verify texture dimensions

#### 4. Camera Not Moving

**Symptoms:**
- WASD keys don't work
- Camera stuck

**Solutions:**
- Check keyboard event listeners
- Verify camera reference
- Check collision detection (might be blocking)
- Verify movement speed > 0

#### 5. Minimap Not Updating

**Symptoms:**
- Minimap shows old position
- Player marker not moving

**Solutions:**
- Check camera reference (`window.__gameCamera`)
- Verify update interval is running
- Check canvas context
- Verify coordinate conversion

#### 6. Buildings Not Rendering

**Symptoms:**
- Land tiles visible but no buildings

**Solutions:**
- Check building data in land object
- Verify building stage
- Check Building3D component logic
- Verify geometry creation

#### 7. Audio Not Playing

**Symptoms:**
- No footstep sounds
- Silent game

**Solutions:**
- Check browser audio permissions
- Verify Web Audio API support
- Check audio context initialization
- Verify isMoving/isOnRoad flags

### Debugging Tips

#### 1. React DevTools
- Install React DevTools extension
- Inspect component tree
- Check props and state
- Profile re-renders

#### 2. Three.js Inspector
```typescript
// Add to CityCanvas.tsx temporarily
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

const DebugHelper = () => {
  const { scene } = useThree();
  useEffect(() => {
    console.log('Scene:', scene);
    // Add helpers
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
  }, [scene]);
  return null;
};
```

#### 3. Performance Profiling
```typescript
// Add performance markers
console.time('render');
// ... render code
console.timeEnd('render');
```

#### 4. Frame Rate Monitoring
```typescript
// In FirstPersonControls or CityCanvas
useFrame(() => {
  if (frameCount % 60 === 0) {
    console.log('FPS:', 1 / delta);
  }
  frameCount++;
});
```

### Browser Compatibility

**Supported Browsers:**
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

**Known Issues:**
- Safari: Web Audio API may require user interaction
- Firefox: Some WebGL features may differ
- Mobile: Performance may be limited

**Testing:**
- Test in multiple browsers
- Test on different devices
- Test with different screen sizes

---

## Quick Reference

### Key File Locations

| File | Purpose |
|------|---------|
| `src/pages/Index.tsx` | Main game logic and state |
| `src/components/game/CityCanvas.tsx` | 3D scene root |
| `src/components/game/LandTile.tsx` | Land plot rendering |
| `src/components/game/FirstPersonControls.tsx` | Camera and movement |
| `src/components/game/CityEnvironment.tsx` | Dynamic city elements |
| `src/types/game.ts` | TypeScript definitions |
| `src/config/pricing.ts` | Game pricing config |

### Key Constants

| Constant | Location | Value |
|----------|----------|-------|
| `GRID_SIZE` | `Index.tsx` | 30 (30x30 = 900 plots) |
| `playerHeight` | `FirstPersonControls.tsx` | 1.6 |
| `speed` | `FirstPersonControls.tsx` | 0.04 (default) |
| `textureSize` | `LandTile.tsx` | 128 |

### Keyboard Controls

| Key | Action |
|-----|--------|
| `WASD` | Move |
| `Mouse Drag` | Look around |
| `Space` | Jump |
| `Q/E` | Move camera up/down |
| `T` | Toggle teleport mode |
| `Middle Mouse` | Toggle pointer lock |

### Zone Colors

| Zone | Color | Hex |
|------|-------|-----|
| Residential | Green | `#10b981` |
| Commercial | Blue | `#3b82f6` |
| Industrial | Orange | `#f59e0b` |
| Agricultural | Lime | `#84cc16` |
| Park | Emerald | `#22c55e` |
| Road | Slate | `#475569` |

---

## Conclusion

This documentation provides a comprehensive guide to understanding, modifying, and optimizing the city builder game. The architecture is designed to be modular and extensible, making it easy to add new features or modify existing ones.

**Key Takeaways:**
- The game uses React Three Fiber for declarative 3D rendering
- Performance is optimized through caching, memoization, and simplified geometry
- The codebase follows React best practices with hooks and TypeScript
- All game logic is centralized in `Index.tsx` for easy modification
- The rendering pipeline is well-structured and documented

**For Questions or Issues:**
- Check the Troubleshooting section
- Review component source code
- Use browser dev tools for debugging
- Profile performance if needed

