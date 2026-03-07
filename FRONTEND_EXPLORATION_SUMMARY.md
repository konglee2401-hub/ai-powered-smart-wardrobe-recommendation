# Frontend Structure & Architecture Summary

## Project Overview
**Framework:** React 18 + Vite
**Styling:** Tailwind CSS 3.3.5 (primary) + Custom CSS with Apple design system
**State Management:** Zustand
**Icons:** Lucide-react
**HTTP Client:** Axios
**i18n:** i18next (English & Vietnamese)
**Real-time:** Socket.io-client

---

## Directory Structure

```
frontend/src/
├── components/
│   ├── ui/
│   │   ├── EmptyState.jsx           # Empty state component with icon & message
│   │   ├── SemanticIconBadge.jsx    # Colored icon badges (6 tones)
│   │   ├── StatusPill.jsx           # Status indicator pills
│   │   └── Skeleton.jsx             # Loading skeleton components
│   ├── Navbar.jsx                   # Main sidebar navigation (collapsible)
│   ├── PageHeaderBar.jsx            # Page title/header component
│   ├── PromptBuilder.jsx            # Prompt building interface
│   ├── GalleryManagement.jsx        # Gallery UI component
│   ├── VideoGenerationProgress.jsx  # Progress tracking
│   ├── ImageUpload.jsx              # File upload component
│   ├── CharacterSelectorModal.jsx   # Modal for selecting characters
│   ├── GalleryPicker.jsx            # Gallery selection interface
│   ├── SessionLogModal.jsx          # View session logs
│   ├── ScenePickerModal.jsx         # Scene selection
│   ├── VideoPromptEnhancedWithChatGPT.jsx
│   ├── PromptFieldBuilder.jsx       # Reusable prompt field builder
│   ├── PromptSuggestions.jsx        # AI-suggested prompts
│   └── ... 40+ component files
├── pages/
│   ├── ImageGenerationPage.jsx      # HOME - Image generation
│   ├── VideoGenerationPage.jsx      # Video generation workflow
│   ├── VoiceOverPage.jsx            # Voice generation
│   ├── OneClickCreatorPage.jsx      # ⭐ One-click automation start-to-finish
│   ├── CharacterListPage.jsx        # Character inventory
│   ├── CharacterCreatorPage.jsx     # Create/edit characters
│   ├── GenerationHistory.jsx        # ⭐ Session history with filters
│   ├── GalleryPage.jsx              # ⭐ Asset gallery with categories
│   ├── PromptBuilder.jsx            # ⭐ Prompt builder tool
│   ├── VideoScriptGenerator.jsx     # ⭐ Script generation tool
│   ├── ModelTester.jsx              # ⭐ Provider testing & benchmarking
│   ├── AIProviderManager.jsx        # ⭐ AI PROVIDER CONFIG/MANAGEMENT
│   ├── PromptTemplateManager.jsx    # Template management
│   ├── Dashboard.jsx                # Overview dashboard
│   ├── AnalyticsPage.jsx            # Performance analytics
│   ├── BatchProcessingPage.jsx      # Batch job management
│   ├── AdvancedCustomizationPage.jsx
│   ├── PerformanceOptimizerPage.jsx
│   ├── ModelStats.jsx               # Provider statistics
│   ├── Login.jsx                    # Authentication
│   ├── SetupAuthentication.jsx      # Auth setup wizard
│   ├── VideoPipeline.jsx            # Video production pipeline
│   └── ... more pages
├── config/
│   ├── appRoutes.jsx                # Route definitions + navigation groups
│   └── api.js                       # API configuration
├── constants/
│   ├── contentUseCases.js
│   ├── videoGeneration.js           # Video generation options
│   └── voiceOverOptions.js          # Voice tones & styles
├── hooks/                           # Custom React hooks
├── services/
│   ├── api.js                       # Main API service
│   ├── axios.js                     # Axios instance config
│   ├── productPhotoService.js       # Photo generation logic
│   ├── generationSessionsService.js # Session management
│   ├── promptTemplateService.js     # Prompt templates API
│   ├── languageAwarePromptService.js # Multilingual prompts
│   └── ... more services
├── stores/                          # Zustand global state stores
├── styles/
│   └── PromptBuilder.css            # Component-specific styles
├── utils/
│   ├── promptTemplates.js           # Prompt generation utilities
│   └── ... utility files
├── i18n/                            # Translations (EN/VI)
├── index.css                        # Global styles + CSS variables
├── App.css                          # Main app layout styles
├── App.jsx                          # Root component with routing
└── main.jsx                         # Vite entry point
```

---

## Routes & Navigation Structure

### Route Mapping
| Path | Component | Type | Purpose |
|------|-----------|------|---------|
| `/` | ImageGenerationPage | Page | Home - Image generation |
| `/video-generation` | VideoGenerationPage | Page | Create videos from images |
| `/voice-over` | VoiceOverPage | Page | Add voice narration |
| `/generate/one-click` | OneClickCreatorPage | Page | ⭐ Full workflow automation |
| `/characters` | CharacterListPage | Page | Browse characters |
| `/characters/create` | CharacterCreatorPage | Page | Create new character |
| `/characters/:id` | CharacterCreatorPage | Page | Edit character |
| `/history` | GenerationHistory | Page | ⭐ View all generation sessions |
| `/gallery` | GalleryPage | Page | ⭐ Asset library & management |
| `/prompt-builder` | PromptBuilder | Page | ⭐ Advanced prompt editor |
| `/prompt-templates` | PromptTemplateManager | Page | Manage prompt templates |
| `/video-script-generator` | VideoScriptGenerator | Page | ⭐ Generate video scripts |
| `/tester` | ModelTester | Page | ⭐ Test providers & models |
| `/stats` | ModelStats | Page | Provider statistics |
| `/dashboard` | Dashboard | Page | Analytics overview |
| `/analytics` | AnalyticsPage | Page | Detailed analytics |
| `/batch` | BatchProcessingPage | Page | Batch job processing |
| `/admin/providers` | AIProviderManager | Page | ⭐ **AI PROVIDER MANAGEMENT** |
| `/customization` | AdvancedCustomizationPage | Page | UI customization |
| `/performance` | PerformanceOptimizerPage | Page | Performance tuning |
| `/options` | OptionsManagement | Page | Settings & options |
| `/video-pipeline` | VideoPipeline | Page | Video production pipeline |

### Navbar Groups (Navigation Structure)

```javascript
navGroups = [
  {
    title: "🎨 GENERATE",
    items: [
      { path: '/', icon: Image, label: 'Image' },
      { path: '/video-generation', icon: Video, label: 'Video' },
      { path: '/voice-over', icon: Volume2, label: 'Voice Over' },
      { path: '/generate/one-click', icon: Sparkles, label: '1-Click' },
      { path: '/characters', icon: UserRound, label: 'Characters' },
      { path: '/video-pipeline', icon: Film, label: 'Video Production' },
    ]
  },
  {
    title: "📁 MEDIA",
    items: [
      { path: '/gallery', icon: Image, label: 'Gallery' },
      { path: '/history', icon: Clock, label: 'History' },
      { path: '/batch', icon: Layers, label: 'Batch Processing' },
    ]
  },
  {
    title: "📊 ANALYTICS",
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/stats', icon: BarChart3, label: 'Statistics' },
      { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
    ]
  },
  {
    title: "🛠️ TOOLS",
    items: [
      { path: '/prompt-builder', icon: FileText, label: 'Prompt Builder' },
      { path: '/prompt-templates', icon: BookOpen, label: 'Templates' },
      { path: '/video-script-generator', icon: Film, label: 'Script Gen' },
      { path: '/tester', icon: Zap, label: 'Provider Tester' },
      { path: '/performance', icon: Gauge, label: 'Performance' },
      { path: '/video-pipeline', icon: TrendingUp, label: 'Video Pipeline' },
    ]
  },
  {
    title: "⚙️ SETTINGS",
    items: [
      { path: '/options', icon: Settings, label: 'Options' },
      { path: '/customization', icon: Sparkles, label: 'Customization' },
      { path: '/setup-authentication', icon: Gauge, label: 'Auth Setup' },
      { path: '/admin/providers', icon: Zap, label: 'AI Providers' },
    ]
  }
]
```

---

## Key Pages in Detail

### ⭐ 1. AIProviderManager.jsx (`/admin/providers`)
**Location:** `frontend/src/pages/AIProviderManager.jsx`

**Purpose:** Configure and manage AI providers, API keys, models, and provider priority

**Key Features:**
- Provider list with capabilities filtering
- Tab system (analysis, image-generation, video-generation)
- Provider priority reordering (up/down buttons)
- Sync models from providers
- API key management
- Provider status indicators (✓/✗)

**Component Structure:**
```jsx
- Header with title + Sync button
- Tab navigation (Analysis | Image Gen | Video Gen)
- Provider list for selected capability
- Up/Down buttons for priority
- Delete provider option
- Add new provider button
```

**Styling:** Gray background (light theme observed), purple accent (`#purple-600`), standard form elements

---

### ⭐ 2. GenerationHistory.jsx (`/history`)
**Location:** `frontend/src/pages/GenerationHistory.jsx`

**Purpose:** View and manage all generated sessions with filtering and search

**Key Features:**
- Session cards in grid layout
- Filter by flow type (1-Click, Image, Video, Voice)
- Filter by status (All, Completed, In-progress, Failed, Cancelled)
- Search by query
- Pagination (20 items per page)
- Delete session action
- Status-based styling (green for completed, orange for in-progress, red for failed)

**UI Components Used:**
- `PageHeaderBar` - Title and breadcrumb
- `StatusPill` - Status badges
- `SemanticIconBadge` - Icon badges with tone colors
- `SkeletonCards` - Loading state
- Surface cards: gradient backgrounds `linear-gradient(180deg, rgba(15,23,42,0.96), rgba(7,14,28,0.98))`

**Status Styling Pattern:**
```css
Failed: border-rose-500/55, red shadow
Completed: border-sky-400/20, blue shadow
In-progress: border-violet-400/25, purple shadow
Default: border-slate-800/80
```

---

### ⭐ 3. GalleryPage.jsx (`/gallery`)
**Location:** `frontend/src/pages/GalleryPage.jsx`

**Purpose:** Browse, organize, and manage media assets with categories

**Key Features:**
- Category system:
  - All media
  - Characters (portraits & source images)
  - Products (packshots & cutouts)
  - Generated (finished outputs)
  - Videos (source clips)
  - Recent (last 24 hours)
  - Favorites (bookmarked)
- Asset statistics (count, storage usage)
- File size formatting utilities
- Recent files preview
- Storage quota tracking (100GB total)

**Sub-component:** `GalleryManagement` - Renders the actual gallery grid

---

### ⭐ 4. PromptBuilder.jsx (`/prompt-builder`)
**Location:** `frontend/src/pages/PromptBuilder.jsx`

**Purpose:** Build fashion/clothing prompts with structured fields

**Key Features:**
- Controlled form with fields:
  - Age group selector
  - Gender selector
  - Style (casual, formal, elegant, sporty, vintage, luxury, etc.)
  - Color options (vibrant, monochrome, pastel, jewel tones, etc.)
  - Material (silk, cotton, wool, leather, linen, etc.)
  - Setting (studio, beach, urban, nature, etc.)
  - Mood/tone selector
- Real-time prompt generation
- Prompt quality indicator
- Custom prompt builder
- Copy-to-clipboard functionality
- Local storage persistence
- Prompt statistics (word count, structure analysis)
- Customization panel for fine-tuning

**Utilities Used:** `promptTemplates.js` utility functions

---

### ⭐ 5. ModelTester.jsx (`/tester`)
**Location:** `frontend/src/pages/ModelTester.jsx`

**Purpose:** Test, benchmark, and compare different AI providers

**Key Features:**
- Provider selection from available models
- Provider status monitoring (online/offline)
- Test image upload with preview
- Test prompt input
- Configuration options:
  - Quality setting
  - Style selection
- Test execution with progress
- Multiple test result tracking
- Performance metrics display
- Available models dropdown

**Styling:** Uses icons (Zap, Play, CheckCircle, XCircle, Clock, etc.) for status indicators

---

### ⭐ 6. OneClickCreatorPage.jsx (`/generate/one-click`)
**Location:** `frontend/src/pages/OneClickCreatorPage.jsx`

**Purpose:** Complete workflow automation: Upload → Analyze → Configure → Generate (Images + Videos)

**Key Features:**
- Multi-step workflow
- Use case selection (wear product, hold product, affiliate video, ecommerce, social media, fashion editorial)
- Focus options (full outfit, top, bottom, shoes)
- Image provider selection (Grok, Google Flow, BFL FLUX)
- Voice settings (gender, pace)
- Character selection modal
- Scene picker modal
- Gallery picker
- Session log viewer
- Real-time progress tracking with WebSocket
- Video count calculator
- Provider-specific duration limits

**Key Constants Used:**
- `USE_CASES` - 6 main scenarios
- `FOCUS_OPTIONS` - 4 area-of-focus options
- `IMAGE_PROVIDERS` - 3 image generation providers
- `GOOGLE_VOICES` - Voice options
- Voice mapping: gender × pace → voice name

---

## Theme & Color System

### Dark Mode Design (Apple-inspired)

#### CSS Variables (index.css)
```css
:root {
  /* Background Colors */
  --apple-bg: #060a14;
  --apple-surface: rgba(15, 23, 42, 0.58);
  --apple-surface-strong: rgba(15, 23, 42, 0.84);
  
  /* Text Colors */
  --apple-text: #e2e8f0;  (slate-100)
  --apple-muted: #94a3b8;  (slate-400)
  
  /* Accent Colors (Color Palette) */
  --apple-accent: #0a84ff;        (Apple Blue)
  --apple-accent-violet: #bf5af2; (Purple)
  --apple-indigo: #5e5ce6;        (Indigo)
  --apple-teal: #64d2ff;          (Cyan/Teal)
  --apple-success: #30d158;       (Green)
  --apple-warning: #ffd60a;       (Amber)
  --apple-orange: #ff9f0a;        (Orange)
  --apple-danger: #ff453a;        (Red)
  
  /* Soft variants for backgrounds */
  --semantic-info-soft: rgba(100, 210, 255, 0.14);
  --semantic-success-soft: rgba(48, 209, 88, 0.14);
  --semantic-warning-soft: rgba(255, 214, 10, 0.14);
  --semantic-danger-soft: rgba(255, 69, 58, 0.14);
  --semantic-accent-soft: rgba(191, 90, 242, 0.14);
}
```

#### Semantic Color Tones (StatusPill, SemanticIconBadge)
```javascript
const TONE_CLASS = {
  info:    'border-cyan-400/30 bg-cyan-500/12 text-cyan-100',
  success: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100',
  warning: 'border-amber-400/30 bg-amber-500/12 text-amber-100',
  danger:  'border-rose-400/30 bg-rose-500/12 text-rose-100',
  accent:  'border-violet-400/30 bg-violet-500/12 text-violet-100',
  pink:    'border-pink-400/30 bg-pink-500/12 text-pink-100',
  neutral: 'border-slate-500/30 bg-slate-500/12 text-slate-200',
}
```

### Styling Techniques

1. **Gradient Cards**
   ```css
   bg-[linear-gradient(180deg, rgba(15,23,42,0.96), rgba(7,14,28,0.98))]
   ```

2. **Glassmorphism (Frosted Glass Effect)**
   ```css
   backdrop-blur-xl
   bg-slate-900/80
   border border-white/15
   ```

3. **Shadow System**
   ```css
   shadow-[0_24px_56px_rgba(2,6,23,0.45)]
   shadow-[0_12px_28px_rgba(124,58,237,0.35)]
   ```

4. **Rounded Radii**
   - Small: `rounded-xl` (2xl border-radius)
   - Medium: `rounded-2xl` 
   - Large: `rounded-3xl`
   - Full: `rounded-full`

5. **Border Styling**
   - Base: `border border-slate-800/80` or `border-white/10`
   - Semi-transparent for depth
   - Subtle opacity variations (`/20`, `/30`, `/55`)

---

## Reusable UI Components

### EmptyState
```jsx
<EmptyState 
  icon={IconComponent}
  title="Nothing here yet"
  description="Description text"
  compact={false}
/>
```
- Used when no data available
- Centered icon badge + message layout

### SemanticIconBadge
```jsx
<SemanticIconBadge 
  icon={IconComponent}
  tone="info" // info|success|warning|danger|accent|pink|neutral
/>
```
- 6 tone variations with colors
- Circular badge design

### StatusPill
```jsx
<StatusPill tone="success">Text</StatusPill>
```
- Inline badge components
- Used for status labels

### Skeleton
- SkeletonBlock - Single line loader
- SkeletonCards - Card grid loader
- Loading state during data fetch

---

## Navigation Component

### Navbar.jsx (`frontend/src/components/Navbar.jsx`)

**Features:**
- Fixed sidebar (collapsible on lg screens)
- Mobile hamburger menu
- Logo with branding: Sparkles icon + "Smart Wardrobe" + tagline
- Grouping system for navigation items
- Active link highlighting with shadow effect
- Language toggle (EN/VI) at bottom
- i18n translations for all labels

**CSS Classes:**
```javascript
baseLinkClass = 'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-300 border border-transparent'

Active state:
'apple-sidebar-link-active text-white border-white/15 shadow-[0_12px_28px_rgba(124,58,237,0.35)]'

Inactive state:
'text-slate-300 hover:text-white hover:bg-white/5 hover:border-white/10'
```

**Responsive Behavior:**
- Desktop (lg+): Static sidebar
- Mobile (<lg): Slide-out drawer with overlay

---

## Form & Input Patterns

### Common Input Types Used:
1. **Dropdowns/Selects** - Style, color, gender selections
2. **Text Inputs** - Prompt text, configuration
3. **File Uploads** - Image selection with preview
4. **Radio Groups** - Use case, focus options
5. **Checkboxes** - Feature toggles
6. **Sliders** - Parameter ranges

### Form Styling:
- Dark backgrounds: `bg-slate-900`, `bg-slate-950`
- Light borders: `border border-slate-700`
- Focus states: Colored borders + shadows
- Tailwind form utilities

---

## API Service Layer

### Services Structure (in `services/`)
- `api.js` - Main API client with endpoints
- `axios.js` - Axios instance configuration
- `productPhotoService.js` - Photo generation
- `generationSessionsService.js` - Session CRUD
- `promptTemplateService.js` - Prompt templates
- `languageAwarePromptService.js` - Multilingual support

### API Base URL
```javascript
API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
```

---

## i18n Implementation

### Locales Supported:
- English (en)
- Vietnamese (vi)

### Translation Keys Examples:
- `navbar.generate` - Section titles
- `navbar.image` - Navigation labels
- `oneClickCreator.scenarios.*` - Use case labels
- `oneClickCreator.focusOptions.*` - Focus option labels
- `language.switchLanguage` - Language toggle

### Usage:
```jsx
const { t, i18n } = useTranslation();
// Access: t('navbar.image')
// Change: i18n.changeLanguage('en'|'vi')
```

---

## Key Dependencies & Versions

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.2.0 | UI library |
| react-router-dom | 6.20.0 | Routing |
| tailwindcss | 3.3.5 | Styling |
| zustand | 4.4.7 | State management |
| lucide-react | 0.294.0 | Icons (150+) |
| axios | 1.6.0 | HTTP client |
| i18next | 25.8.13 | Internationalization |
| socket.io-client | 4.7.0 | Real-time communication |
| react-hot-toast | 2.4.1 | Notifications/toasts |
| react-photo-album | 3.5.1 | Gallery component |
| date-fns | 2.30.0 | Date utilities |
| vite | 5.0.0 | Build tool |

---

## Performance & Build

### Vite Configuration
- React Fast Refresh enabled
- Module transpilation
- Code splitting with lazy loading

### Code Splitting Strategy
- All page components use `lazy()` import
- Suspense boundaries with `RouteFallback` component
- Fallback UI: Loading indicator with animated pulse

### CSS Optimization
- Tailwind CSS purging (only used classes bundled)
- PostCSS pipeline with autoprefixer
- Minification in production build

---

## Development Workflow

### Commands:
```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run test:e2e     # Playwright E2E tests
```

### Project Structure Benefits:
- Modular component organization
- Clear separation of concerns (pages/components/services)
- Centralized routing and config
- i18n for multilingual support
- Consistent theming via CSS variables
- Tailwind for rapid, responsive UI development

---

## UI/UX Patterns Observed

### Pattern 1: Card-Based Layouts
Used in: History, Gallery, Dashboard
- Gradient background cards
- Border with subtle opacity
- Shadow for depth
- Hover effects

### Pattern 2: Tab Navigation
Used in: AIProviderManager, some analytics pages
- Underline/border indicator
- Smooth transitions between tabs
- Content swapping

### Pattern 3: Multi-Step Workflows
Used in: 1-Click Creator, Video Generation
- Expandable/collapsible steps
- Progress indicators
- Step validation
- User session tracking

### Pattern 4: Filtering & Sorting
Used in: History, Gallery, Provider lists
- Multiple filter categories
- Quick filter buttons
- Search input
- Results counter

### Pattern 5: Modal Windows
Used in: Character selection, Scene picking, Logs
- Overlay backdrop
- Centered content
- Close button
- Animation transitions

---

## Notes for Development

### When Adding New Features:
1. Add route to `config/appRoutes.jsx` (pageRoutes array)
2. Add navbar item to `navGroups` in `config/appRoutes.jsx`
3. Create page component in `pages/`
4. Create any shared components in `components/`
5. Use existing UI components (StatusPill, EmptyState, etc.)
6. Follow dark theme with Apple design system principles
7. Add i18n keys for labels
8. Use Tailwind utilities for responsive design
9. Follow established folder structure

### Color Usage Guide:
- **Primary action buttons**: Use violet (#bf5af2) or blue (#0a84ff)
- **Success states**: Use emerald (#30d158)
- **Warning/attention**: Use amber (#ffd60a)
- **Errors/danger**: Use red (#ff453a)
- **Info/secondary**: Use cyan (#64d2ff) or teal
- **Text**: Use slate-100 (#e2e8f0) on dark backgrounds
- **Borders**: Use slate-800/80 or white/10-15

### Responsive Breakpoints (from tailwind.config.js):
```javascript
sm: 640px
md: 968px
lg: 969px
xl: 1280px
2xl: 1536px
```

