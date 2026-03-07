# Frontend - Quick Reference: Key Pages & Files

## 📍 File Paths Summary

### ⭐ Required Pages You Asked About:

```
frontend/src/pages/
├── AIProviderManager.jsx            ← AI PROVIDER PAGE (/admin/providers)
├── ModelTester.jsx                  ← PROVIDER TESTER PAGE (/tester)
├── PromptBuilder.jsx                ← PROMPT BUILDER PAGE (/prompt-builder)
├── VideoScriptGenerator.jsx         ← VIDEO SCRIPT GENERATOR PAGE (/video-script-generator)
├── OneClickCreatorPage.jsx          ← ONE CLICK PAGE (/generate/one-click)
├── GenerationHistory.jsx            ← HISTORY PAGE (/history)
└── GalleryPage.jsx                  ← GALLERY PAGE (/gallery)
```

---

## Navigation Component

```
frontend/src/
├── components/
│   └── Navbar.jsx                   ← MAIN NAVIGATION SIDEBAR
│       - Collapsible sidebar
│       - 5 nav groups (Generate, Media, Analytics, Tools, Settings)
│       - Language toggle (EN/VI)
│
└── config/
    └── appRoutes.jsx                ← ROUTE & NAVBAR DEFINITIONS
        - pageRoutes array (all routes)
        - navGroups array (sidebar structure)
        - Lazy-loaded page imports
```

---

## Component Structure Map

```
frontend/src/components/

UI Components (base, reusable):
├── ui/
│   ├── EmptyState.jsx              ← Empty state fallback
│   ├── SemanticIconBadge.jsx       ← Color-toned icon badges (6 tones)
│   ├── StatusPill.jsx              ← Status inline badges
│   └── Skeleton.jsx                ← Loading skeletons
│
Major Components:
├── Navbar.jsx                      ← Sidebar navigation
├── PageHeaderBar.jsx               ← Page title/header
├── PromptBuilder.jsx               ← Prompt building interface
├── GalleryManagement.jsx           ← Gallery UI
├── GalleryPicker.jsx               ← Gallery item selection modal
├── ImageUpload.jsx                 ← File upload component
├── CharacterSelectorModal.jsx      ← Character selection modal
├── ScenePickerModal.jsx            ← Video scene selection
├── SessionLogModal.jsx             ← Session logs viewer
├── VideoGenerationProgress.jsx     ← Progress tracker
├── VideoPromptEnhancedWithChatGPT.jsx
├── PromptFieldBuilder.jsx          ← Reusable prompt field
├── PromptSuggestions.jsx           ← AI suggestions
├── StyleOptions.jsx                ← Style customization
└── ... 30+ other components

VideoProduction Subcomponents:
└── VideoProduction/                ← Video-specific components
    └── ... video workflow components

VideoGeneration Subcomponents:
└── video-pipeline/                 ← Pipeline components
    └── ... pipeline workflow components

Trend Automation:
└── trend-automation/               ← Trending feature
    └── ... trend components
```

---

## Styling Files

```
frontend/src/

Global Styles:
├── index.css                       ← ROOT STYLES + CSS VARIABLES
│   - Dark mode color scheme
│   - Apple design system tokens
│   - Tailwind directives
│
├── App.css                         ← APP LAYOUT STYLES
│   - App shell layout
│   - Sidebar styles
│   - Main content area
│   - Responsive classes
│   - Component-level overrides
│
└── styles/
    └── PromptBuilder.css           ← Component-specific styles

Note: Most styling is done with Tailwind utilities directly in JSX
CSS files are for complex or non-Tailwind styles only
```

---

## Color Scheme & Theme

### Primary Theme: Dark Mode (Apple-inspired)

**CSS Variables Location:** `frontend/src/index.css`

**Color Palette:**
- Background: `#060a14` (very dark blue)
- Surface: `rgba(15, 23, 42, 0.58-0.84)` (dark slate)
- Text: `#e2e8f0` (light slate)
- Accents:
  - Blue: `#0a84ff`
  - Violet: `#bf5af2` (primary UI)
  - Teal: `#64d2ff`
  - Green: `#30d158`
  - Amber: `#ffd60a`
  - Red: `#ff453a`

**Styling System:**
- Primary: Tailwind CSS utilities
- Secondary: Custom CSS variables
- Effects: Gradients, glassmorphism, shadows
- Icons: Lucide-react (150+ icons)

---

## 🎯 Key Features by Page

### AIProviderManager.jsx
- Provider list management
- Capability filtering (tabs)
- Priority reordering (up/down buttons)
- API key configuration
- Sync models button
- Provider status indicators

### ModelTester.jsx
- Provider/model selection dropdown
- Test image upload
- Test prompt input
- Configuration (quality, style)
- Execute test button
- Results display with metrics
- Provider status monitoring

### PromptBuilder.jsx
- Age, gender, style, color dropdowns
- Material & setting selectors
- Mood/tone selector
- Real-time prompt preview
- Quality indicator
- Customization panel
- Copy-to-clipboard
- Save to templates

### VideoScriptGenerator.jsx
- (Structure similar to PromptBuilder)
- Script-specific fields
- Video timing controls
- Scene suggestions

### OneClickCreatorPage.jsx
- Use case selector (6 options)
- Focus selector (4 options)
- Image provider picker (3 providers)
- Character modal selector
- Scene picker modal
- Gallery picker
- Voice settings (gender × pace)
- Progress tracking
- Session log viewer

### GenerationHistory.jsx
- Session card grid
- Flow type filters (1-Click, Image, Video, Voice)
- Status filters (All, Completed, In-progress, Failed)
- Search functionality
- Pagination (20 per page)
- Delete action
- Status-based card styling
- Statistics summary

### GalleryPage.jsx
- Category navigation (7 categories)
- Asset grid display
- Statistics (count, storage)
- Recent files section
- File size formatting
- Category metadata
- Favorites support

---

## 🔧 Services Layer

```
frontend/src/services/

API & Business Logic:
├── api.js                          ← Main API client
├── axios.js                        ← HTTP instance config
├── productPhotoService.js          ← Photo generation
├── generationSessionsService.js    ← Session CRUD
├── promptTemplateService.js        ← Prompt templates
├── languageAwarePromptService.js   ← Multilingual
└── ... more service files

Entry Point for Backend:
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
```

---

## 📱 Responsive Design

### Breakpoints (from tailwind.config.js):
```javascript
sm:  640px
md:  968px
lg:  969px   ← Main breakpoint for sidebar behavior
xl:  1280px
2xl: 1536px
```

### Navbar Behavior:
- Desktop (lg+): Fixed sidebar visible
- Mobile (<lg): Slide-out drawer with hamburger menu

---

## 🌍 i18n (Internationalization)

**Languages:** English (en) & Vietnamese (vi)

**Implementation:**
- Use `const { t } = useTranslation()` in components
- Access keys: `t('navbar.image')`, `t('oneClickCreator.scenarios.*')`

**Folder:** `frontend/src/i18n/` (translation files)

---

## 📦 Dependencies Summary

```json
{
  "react": "18.2.0",
  "react-router-dom": "6.20.0",
  "tailwindcss": "3.3.5",
  "zustand": "4.4.7",
  "lucide-react": "0.294.0",
  "axios": "1.6.0",
  "i18next": "25.8.13",
  "socket.io-client": "4.7.0",
  "react-hot-toast": "2.4.1",
  "react-photo-album": "3.5.1",
  "date-fns": "2.30.0"
}
```

---

## 📋 Development Notes

### File Naming Conventions:
- Page components: `[NameOf]Page.jsx`
- Regular components: `CamelCase.jsx`
- CSS files: Match component name or use `.css`
- Utils: `camelCase.js`

### Component Patterns:
1. **Controlled forms** - State-driven inputs
2. **Modal dialogs** - Overlay + content
3. **Data loading** - Skeleton fallbacks
4. **Error handling** - Toast notifications
5. **Filtering** - Button groups + search
6. **Pagination** - Page size constants

### Best Practices in Codebase:
- Use `lazy()` for all page imports
- Wrap routes with `Suspense + RouteFallback`
- Use semantic colors (info, success, warning, danger, accent)
- Follow Apple design system principles
- Keep components small & focused
- Use custom hooks for logic reuse
- Leverage Zustand for global state
- Use Tailwind first, CSS variables for theme

---

## 🎨 Styling Quick Guide

### Common Tailwind Classes Used:
```css
/* Spacing */
px-3 py-2.5  /* Standard padding */
gap-3        /* Component gaps */

/* Colors */
text-slate-100, text-white, text-slate-300
bg-slate-900, bg-slate-950, bg-white/5

/* Borders */
border border-slate-800/80
rounded-2xl, rounded-xl, rounded-3xl

/* Effects */
shadow-[custom]
backdrop-blur-xl
transition-all duration-300

/* Layout */
flex items-center justify-between
grid-cols-3, grid-cols-auto
overflow-y-auto
```

### Custom Classes (in App.css + index.css):
```css
.app-shell          /* Root container */
.app-main           /* Main content area */
.app-sidebar        /* Sidebar container */
.apple-sidebar-link-active  /* Active nav item */
.apple-bg, .apple-surface  /* Background tokens */
.flat-panel         /* Card-like container */
```

---

## 🚀 Quick Start for New Feature

1. **Create page route:**
   ```javascript
   // In config/appRoutes.jsx
   const NewPage = lazy(() => import('../pages/NewPage'));
   
   // In pageRoutes:
   { path: '/new-page', Component: NewPage },
   
   // In navGroups:
   { path: '/new-page', labelKey: 'navbar.newPage', icon: IconName }
   ```

2. **Create page file:**
   ```jsx
   // frontend/src/pages/NewPage.jsx
   import { useState } from 'react';
   
   export default function NewPage() {
     return (
       <div className="max-w-6xl mx-auto p-6">
         {/* Page content */}
       </div>
     );
   }
   ```

3. **Use components:**
   - Import UI components from `components/ui/`
   - Use `PageHeaderBar` for title
   - Use `EmptyState` for empty views
   - Use toasts for feedback

4. **Add translations:**
   - Add keys to i18n files
   - Reference with `t('key')`

5. **Style with Tailwind:**
   - Use predefined utilities
   - Reference CSS variables for consistency
   - Follow dark theme color scheme

---

