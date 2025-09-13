# The Prospector - Wild West Gaming Tool Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from Western-themed games like Red Dead Redemption, Deadwood, and classic Wild West aesthetics combined with modern gaming interfaces.

## Core Design Elements

### A. Color Palette
**Dark Mode Primary** (Wild West Theme):
- Primary Background: 28 15% 8% (Deep dark brown/black)
- Container Background: 30 20% 12% (Dark weathered wood)
- Accent Gold: 43 65% 70% (Rustic gold #d4b58e)
- Text Primary: 43 25% 85% (Warm off-white)
- Text Secondary: 43 15% 65% (Muted gold-brown)

### B. Typography
- **Primary Font**: 'Creepster' (Google Fonts) for main title - evokes Wild West wanted posters
- **Body Font**: System font stack for readability
- **Hierarchy**: Large title (3xl+), medium subtitles, standard body text

### C. Layout System
**Tailwind Spacing**: Primary units of 4, 6, 8, and 12
- Generous padding (p-6, p-8) for breathing room
- Consistent margins (m-4, m-6) between elements
- Large gaps (gap-6, gap-8) in grid layouts

### D. Component Library

**Core UI Elements**:
- **Container**: Semi-transparent dark background with thick gold border (border-4)
- **Search Input**: Gold border, dark background, rounded styling
- **Buttons**: Gold background with rounded corners, subtle transitions
- **Cards**: Dark containers with gold accents, shadow effects

**Navigation**: Minimal - single-page focus on prospecting tool

**Forms**: 
- Dark inputs with gold borders
- Themed placeholder text ("What are you prospecting for?")
- Large, prominent search button

**Data Displays**:
- Grid layout for game results (responsive: 1-3 columns)
- Individual game cards with title, rating, description
- Loading states with themed messaging

**Overlays**: Simple loading indicator with spinning icon

### E. Visual Treatments

**Themed Messaging**:
- "Prospecting for gold nuggets..." (loading)
- "No gold nuggets found. Try a new claim!" (empty state)
- "Stake a Claim" (action buttons)

**Border & Effects**:
- Rounded corners (rounded-xl) for modern touch
- Shadow effects for depth
- Gold borders for emphasis
- Semi-transparent overlays

**Gradients**: Subtle dark gradients on containers to enhance the weathered wood aesthetic

## Key Design Principles
1. **Authentic Western Theme**: Consistent use of gold, dark wood, and rustic typography
2. **Gaming-Friendly UX**: Clear hierarchy, prominent search, easy-to-scan results
3. **Immersive Language**: All UI text maintains Wild West prospecting metaphors
4. **Modern Functionality**: Clean, responsive design with smooth interactions
5. **Single-Purpose Focus**: Streamlined interface centered on game search functionality

## Images
**No hero image required** - the design relies on typography, color, and thematic elements rather than imagery. The dark, textured background serves as the primary visual foundation.