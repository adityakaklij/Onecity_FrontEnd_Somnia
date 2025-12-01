---
inclusion: always
---

# Coding Standards for OneCity.space

## TypeScript Guidelines
- Use TypeScript for all new files
- Define proper interfaces for props and data structures
- Avoid `any` type - use proper typing or `unknown`
- Use type inference where possible

## React Best Practices
- Use functional components with hooks
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks
- Use proper dependency arrays in useEffect

## Component Structure
```typescript
// 1. Imports (grouped: React, external libs, internal components, types, styles)
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Player } from '@/types/game';

// 2. Type definitions
interface ComponentProps {
  // props
}

// 3. Component declaration
export const Component = ({ prop }: ComponentProps) => {
  // 4. State declarations
  const [state, setState] = useState();
  
  // 5. Effects
  useEffect(() => {}, []);
  
  // 6. Event handlers
  const handleClick = () => {};
  
  // 7. Render
  return <div></div>;
};
```

## Naming Conventions
- Components: PascalCase (e.g., `GameHeader`, `LandTile`)
- Files: Match component name (e.g., `GameHeader.tsx`)
- Functions: camelCase (e.g., `connectWallet`, `mintLand`)
- Constants: UPPER_SNAKE_CASE (e.g., `CONTRACT_ADDRESS`)
- Interfaces: PascalCase with descriptive names (e.g., `GameHeaderProps`)

## File Organization
- One component per file
- Co-locate related components in feature folders
- Keep service/utility files in `src/lib/`
- Store types in `src/types/`

## Code Quality
- Remove unused imports and variables
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable names
- Handle errors gracefully with try-catch
