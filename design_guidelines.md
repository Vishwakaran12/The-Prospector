# Content Discovery Tool - Professional Design Guidelines

## Design Approach
**Design System Approach**: Material Design principles with premium customizations, emphasizing clean minimalism and professional sophistication for content management tools.

## Core Design Elements

### A. Color Palette
**Dark Mode Primary**:
- Primary Background: 220 15% 8% (Deep charcoal)
- Container Background: 220 10% 12% (Subtle dark gray)
- Accent Blue: 210 85% 65% (Professional blue)
- Text Primary: 0 0% 95% (Clean white)
- Text Secondary: 0 0% 70% (Muted gray)
- Success Green: 140 60% 55% (Content found)
- Warning Amber: 35 85% 60% (Processing states)

**Light Mode Primary**:
- Primary Background: 0 0% 98% (Clean white)
- Container Background: 220 10% 96% (Subtle light gray)
- Text Primary: 220 15% 15% (Dark charcoal)
- Text Secondary: 220 10% 45% (Medium gray)

### B. Typography
- **Primary Font**: Inter (Google Fonts) - modern, professional sans-serif
- **Monospace**: JetBrains Mono for URLs and technical content
- **Hierarchy**: Clean scale from text-sm to text-4xl with consistent line heights

### C. Layout System
**Tailwind Spacing**: Primary units of 4, 6, 8, 16, and 24
- Generous whitespace (p-8, p-16) for premium feel
- Consistent component spacing (gap-6, gap-8)
- Large content areas with breathing room

### D. Component Library

**Core UI Elements**:
- **Containers**: Clean cards with subtle shadows and rounded-lg borders
- **Search Interface**: Prominent search bar with advanced filters
- **Action Buttons**: Primary blue with subtle gradients, secondary outlined variants
- **Status Indicators**: Color-coded chips for content status (scraped, processing, failed)

**Navigation**:
- Clean sidebar with organized sections (Search, Claims, History, Settings)
- Breadcrumb navigation for deep content exploration
- Tabbed interfaces for data organization

**Forms**:
- Floating labels with smooth transitions
- Input groups for complex search parameters
- Toggle switches for advanced options
- Multi-select dropdowns for content filtering

**Data Displays**:
- **Content Grid**: Responsive masonry layout for discovered content
- **Claims Management**: Table view with sorting, filtering, and bulk actions
- **Content Preview**: Modal overlays with full content display
- **Analytics Dashboard**: Clean charts and metrics cards

**Overlays**:
- Modal dialogs for content details and settings
- Slide-over panels for quick actions
- Toast notifications for status updates
- Loading skeletons maintaining layout structure

### E. Visual Treatments

**Professional Messaging**:
- "Discovering content..." (loading states)
- "Content discovery complete" (success)
- "Manage your content claims" (section headers)
- "Premium content discovery at your fingertips" (hero messaging)

**Effects & Interactions**:
- Subtle hover states with gentle transitions
- Card elevation changes on interaction
- Progressive disclosure for advanced features
- Smooth page transitions between sections

**Gradients**: Minimal use - subtle background gradients on hero sections and premium feature highlights using primary and accent blue tones.

## Key Design Principles
1. **Professional Elegance**: Clean lines, generous whitespace, sophisticated color choices
2. **Content-First Design**: Clear hierarchy emphasizing discovered content and claims
3. **Premium User Experience**: Smooth interactions, helpful micro-animations, polished details
4. **Scalable Architecture**: Modular components supporting complex data relationships
5. **Accessibility Focus**: High contrast ratios, clear focus states, comprehensive keyboard navigation

## Images
**Hero Image**: Large, abstract geometric pattern or subtle gradient overlay representing data discovery and content mapping. Positioned as full-width hero section with overlay text and primary CTA.

**Content Thumbnails**: Placeholder cards for scraped content previews in grid layouts.

**Empty States**: Minimalist illustrations for empty search results and new user onboarding.