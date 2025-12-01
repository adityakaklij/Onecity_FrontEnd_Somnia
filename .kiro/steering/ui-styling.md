---
inclusion: always
---

# UI and Styling Guidelines

## Tailwind CSS Usage
- Use Tailwind utility classes for styling
- Follow mobile-first responsive design
- Use consistent spacing scale (4, 8, 12, 16, 24, 32, etc.)

## Component Library
- Use shadcn/ui components from `@/components/ui/`
- Customize components via Tailwind classes
- Maintain consistent button styles across the app

## Color Scheme
The project uses a glassmorphism design with zone-specific colors:

### Zone Colors
- **Residential**: `hsl(142 76% 36%)` - Green
- **Commercial**: `hsl(217 91% 60%)` - Blue
- **Industrial**: `hsl(38 92% 50%)` - Orange
- **Agricultural**: `hsl(84 81% 44%)` - Lime

### UI Elements
- Background: Gradient with blur effects
- Cards: `rgba(255, 255, 255, 0.1)` with backdrop blur
- Borders: `rgba(255, 255, 255, 0.15)`
- Text: White with varying opacity (90%, 80%)

## Glassmorphism Pattern
```typescript
style={{
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
}}
```

## Responsive Design
- Hide non-essential elements on mobile: `hidden sm:flex`
- Stack elements vertically on small screens
- Use appropriate breakpoints: `sm:`, `md:`, `lg:`, `xl:`

## Animation and Transitions
- Use `transition-all duration-200` for smooth interactions
- Add hover effects: `hover:scale-105`
- Use glow effects for important elements: `hover:drop-shadow-[0_0_8px_rgba(...)]`

## Icons
- Use Lucide React icons consistently
- Size: `w-4 h-4` for small icons, `w-5 h-5` for medium
- Color: Match zone colors or use white with opacity

## Accessibility
- Ensure sufficient color contrast
- Add proper ARIA labels where needed
- Make interactive elements keyboard accessible
- Provide visual feedback for all interactions
