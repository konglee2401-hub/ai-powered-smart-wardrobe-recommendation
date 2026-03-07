# Frontend Architecture Diagram

## Component Hierarchy Tree

```
App.jsx (Root)
├── Router
└── Routes
    ├── PageLayout (Wrapper)
    │   ├── Navbar.jsx (Sidebar Navigation)
    │   │   ├── Logo + Branding
    │   │   ├── NavGroups[5]
    │   │   │   ├── Generate Group
    │   │   │   ├── Media Group
    │   │   │   ├── Analytics Group
    │   │   │   ├── Tools Group
    │   │   │   └── Settings Group
    │   │   └── Language Toggle
    │   └── main.app-main
    │       ├── PageHeaderBar (Per-page header)
    │       └── Page Component (Lazy-loaded)
    │           ├── ... Page-specific UI
    │           └── Sub-components
    │
    └── Redirect Routes (Fallbacks)

```

## Data Flow Architecture

```
┌─────────────────────────────────────────┐
│       User Interface (React)             │
├─────────────────────────────────────────┤
│  Pages (ImageGen, VideoGen, OneClick... │
│  ↓                                       │
│  Components (Prompts, Gallery, Modals)  │
│  ↓                                       │
│  UI Base Components (StatusPill, Badge) │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│    State Management (Zustand)            │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│    Services Layer (API Calls)            │
├─────────────────────────────────────────┤
│  - api.js (Main client)                 │
│  - axios.js (HTTP configuration)        │
│  - productPhotoService.js               │
│  - generationSessionsService.js         │
│  - promptTemplateService.js             │
│  - languageAwarePromptService.js        │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│    Backend API                           │
│    (Node.js/Express @ localhost:5000)   │
└─────────────────────────────────────────┘
```

## Page Navigation Map

```
NAVBAR GROUPS
│
├─── GENERATE GROUP ───────────────────────────┐
│    ├─ Image (/) ─────→ ImageGenerationPage    │
│    ├─ Video ─────────→ VideoGenerationPage    │
│    ├─ Voice Over ────→ VoiceOverPage         │
│    ├─ 1-Click ───────→ OneClickCreatorPage   │
│    ├─ Characters ────→ CharacterListPage     │
│    └─ Video Prod ────→ VideoPipeline         │
│
├─── MEDIA GROUP ───────────────────────────────┐
│    ├─ Gallery ─────→ GalleryPage              │
│    ├─ History ─────→ GenerationHistory        │
│    └─ Batch ───────→ BatchProcessingPage      │
│
├─── ANALYTICS GROUP ────────────────────────────┐
│    ├─ Dashboard ─→ Dashboard                   │
│    ├─ Statistics ─→ ModelStats                 │
│    └─ Analytics ──→ AnalyticsPage              │
│
├─── TOOLS GROUP ────────────────────────────────┐
│    ├─ Prompt Builder ────→ PromptBuilder       │
│    ├─ Templates ────────→ PromptTemplateManager│
│    ├─ Script Generator ──→ VideoScriptGenerator│
│    ├─ Provider Tester ───→ ModelTester        │
│    ├─ Performance ──────→ PerformanceOptimizer│
│    └─ Video Pipeline ───→ VideoPipeline       │
│
└─── SETTINGS GROUP ────────────────────────────┐
     ├─ Options ───────────→ OptionsManagement    │
     ├─ Customization ─────→ AdvancedCustomization│
     ├─ Auth Setup ────────→ SetupAuthentication │
     └─ AI Providers ──────→ AIProviderManager   │
```

## AI Provider Management Flow

```
AIProviderManager Page (/admin/providers)
│
├─ Load Providers (useEffect)
│  └─ API: GET /api/providers
│     └─ Sets providers state
│
├─ Tab Navigation: [Analysis | Image Gen | Video Gen]
│  └─ Filters providers by capability
│
├─ Provider List Display
│  ├─ Provider Name
│  ├─ Status Indicator (✓/✗)
│  ├─ Models List
│  ├─ API Key
│  ├─ Priority Controls
│  │  ├─ Move Up (↑)
│  │  ├─ Move Down (↓)
│  │  └─ API: PUT /api/providers/reorder
│  ├─ Remove Button (🗑️)
│  │  └─ API: DELETE /api/providers/{id}
│  └─ Edit Button (✏️)
│
└─ Sync Button
   └─ API: POST /api/providers/sync
      └─ Refreshes models from provider APIs
```

## One-Click Creator Workflow

```
OneClickCreatorPage (/generate/one-click)
│
Step 1: Upload Image
├─ ImageUpload Component
├─ File validation
└─ Preview display

Step 2: Select Use Case
├─ 6 Options:
│  ├─ Change clothes (wear product)
│  ├─ Hold product
│  ├─ Affiliate video TikTok
│  ├─ E-commerce product
│  ├─ Social media
│  └─ Fashion editorial
└─ Selection persists in session

Step 3: Configure Generation
├─ Focus Area Selector (4 options: full-outfit, top, bottom, shoes)
├─ Image Provider Picker (Grok, Google Flow, BFL FLUX)
├─ Character Selection Modal
│  └─ CharacterSelectorModal Component
├─ Scene Picker Modal
│  └─ ScenePickerModal Component
└─ Gallery Picker
   └─ GalleryPicker Component

Step 4: Voice Settings (if video)
├─ Gender Selector (male/female)
├─ Pace Selector (slow/normal/fast)
└─ Auto-mapped to Gemini TTS voices:
   ├─ Female: enceladus(slow) → aoede(normal) → fenrir(fast)
   └─ Male: charon(slow) → kore(normal) → puck(fast)

Step 5: Generate (API Calls)
├─ API: POST /api/generate/one-click
├─ Real-time progress via WebSocket
├─ Results displayed progressively
└─ SessionLogModal shows execution log
```

## Generation History View

```
GenerationHistory (/history)
│
┌─ Page Header ────────────────────┐
│ Title | Sort | View options       │
└───────────────────────────────────┘
        ↓
┌─ Filter Bar ──────────────────────────┐
│ Flow Type Filters:                    │
│ [All] [1-Click] [Image] [Video][Voice]│
│                                        │
│ Status Filters:                       │
│ [All] [Completed] [In-progress]       │
│ [Failed] [Cancelled]                  │
│                                        │
│ Search Input: ___________             │
└────────────────────────────────────────┘
        ↓
┌─ Session Cards Grid ──────────────────┐
│ ┌─ Card 1 ────────────────────────┐   │
│ │ Title                            │   │
│ │ Status: [Pill Component]         │   │
│ │ Flow: [SemanticIconBadge]        │   │
│ │ Date & Time                      │   │
│ │ [Copy ID] [View] [Delete]        │   │
│ └──────────────────────────────────┘   │
│ ┌─ Card 2 ─ ...                       │
│ │ ...                              │   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
        ↓
┌─ Pagination ──────────────────────┐
│ Showing 1-20 of 150               │
│ [< Previous] [1] [2] [3] [Next >] │
└───────────────────────────────────┘
```

## Gallery Page Structure

```
GalleryPage (/gallery)
│
┌─ Header + Stats ──────────────────────┐
│ Gallery Title                         │
│ Total: 500 items | Size: 45.2 GB      │
└───────────────────────────────────────┘
        ↓
┌─ Category Navigation ─────────────────┐
│ [All Media] [Characters] [Products]   │
│ [Generated] [Videos] [Recent]         │
│ [Favorites]                           │
│                                       │
│ Category Stats (per category):        │
│ Characters: 120 files                 │
│ Products: 85 files                    │
│ Generated: 200 files                  │
│ Videos: 45 files                      │
└───────────────────────────────────────┘
        ↓
┌─ Recent Files Section ────────────────┐
│ [6 most recent files as thumbnails]   │
│ Created/Modified info                 │
└───────────────────────────────────────┘
        ↓
┌─ Main Gallery Grid ───────────────────┐
│ (GalleryManagement Component)          │
│                                       │
│ [Image 1] [Image 2] [Image 3]         │
│ [Image 4] [Image 5] [Image 6]         │
│ ... (many more)                       │
│                                       │
│ File info overlay on hover:           │
│ - Filename                            │
│ - Size                                │
│ - Created date                        │
│ - Action buttons (view, delete, move) │
└───────────────────────────────────────┘
```

## Prompt Builder Workflow

```
PromptBuilder (/prompt-builder)
│
┌─ Form Section ─────────────────────┐
│  Input Fields (organized):          │
│                                     │
│  🧑 Demographics:                   │
│     Age: [Select dropdown]          │
│     Gender: [Radio buttons]         │
│                                     │
│  🎨 Aesthetics:                     │
│     Style: [Dropdown - 9 options]  │
│     Colors: [Dropdown - 6+ options]│
│     Material: [Dropdown - 6 types] │
│                                     │
│  📍 Context:                        │
│     Setting: [Dropdown - Multi]    │
│     Mood: [Dropdown - Tones]       │
│                                     │
│  🔧 Actions:
│     [Clear] [Generate] [Enhance]   │
└─────────────────────────────────────┘
        ↓
┌─ Live Prompt Preview ──────────────┐
│ "A 25-year-old woman in an         │
│  elegant white silk dress,         │
│  studio setting, professional      │
│  photography, high fashion..."     │
│                                     │
│ [Copy to Clipboard] [Save Template]│
└─────────────────────────────────────┘
        ↓
┌─ Prompt Stats ─────────────────────┐
│ Word Count: 45                      │
│ Structure Score: 8.5/10             │
│ Quality: High                       │
└─────────────────────────────────────┘
        ↓
┌─ Customization Panel ──────────────┐
│ (Optional - collapsible)            │
│                                     │
│ Fine-tune prompt:                   │
│ - Add specific keywords             │
│ - Adjust tone                       │
│ - Remove unnecessary words          │
│ - Enhance with style modifiers      │
└─────────────────────────────────────┘
```

## Styling System Hierarchy

```
Global Level:
├─ index.css
│  └─ CSS Variables (colors, spacing, transitions)
│  └─ Tailwind directives (@tailwind base/components/utilities)
│  └─ Root element colors & theme
│
├─ App.css
│  └─ App shell layout (.app-shell, .app-main, .app-sidebar)
│  └─ Page decorations (.app-main-glow, .apple-page)
│  └─ Typography (.apple-typography)
│  └─ Custom utility classes
│
Component Level:
├─ [ComponentName].css (if complex)
│  └─ Component-specific styles
│
└─ Inline Tailwind (majority)
   └─ Utility-first CSS in JSX className

Theme Application:
├─ Dark mode by default (:root selector)
├─ CSS variables for semantic colors
│  ├─ --apple-bg (backgrounds)
│  ├─ --apple-accent (actions)
│  └─ --semantic-* (functional colors)
│
└─ Tailwind utilities reference CSS vars
   └─ bg-slate-900, text-slate-100, etc.
```

## Component Reuse Pattern

```
Base UI Components:
├─ EmptyState
│  └─ Used in: History (no items), Gallery (empty category)
│  └─ Props: icon, title, description, compact
│
├─ StatusPill
│  └─ Used in: History cards, Session details
│  └─ Props: children, tone (color variant)
│
├─ SemanticIconBadge
│  └─ Used in: Filter buttons, Status indicators
│  └─ Props: icon, tone (color variant)
│
└─ Skeleton Components
   └─ Used in: All loading states
   └─ Props: width, height, animation

Page Components:
├─ PageHeaderBar
│  └─ Used in: All pages for consistent headers
│  └─ Props: title, breadcrumb, actions
│
├─ GalleryManagement
│  └─ Used in: Gallery page
│  └─ Handles: Grid rendering, selection, actions
│
└─ Modal Components (contextual)
   ├─ CharacterSelectorModal (OneClickCreator)
   ├─ ScenePickerModal (OneClickCreator)
   ├─ SessionLogModal (OneClickCreator)
   └─ GalleryPicker (OneClickCreator)
```

---

## Key Integration Points

### Frontend → Backend Communication

```
Frontend (React)
    ↓
Axios Instance (axios.js)
    ↓
API Client (api.js)
    ↓
Service Layers (productPhotoService, etc.)
    ↓
Components (Pages + UI)
    ↓
User Interface (React)
    ↑
WebSocket (socket.io-client) - Real-time updates
    ↓
Backend Express API (localhost:5000/api)
```

### State Management Pattern

```
Global State (if needed):
├─ Zustand Stores (in stores/)
│  └─ Persistent state across page navigation
│
Component Local State:
├─ useState for component-specific state
├─ useEffect for side effects
├─ useCallback for memoized handlers
└─ Custom hooks for reusable logic
```

---

## Responsive Layout

```
Mobile (<lg: 969px)
├─ Navbar as slide-out drawer
│  ├─ Hamburger menu button (top-left)
│  ├─ Dark overlay when open
│  ├─ Close on navigation
│  └─ z-index: 40
│
└─ Full-width content
   ├─ Padding adjustments
   ├─ Single column layouts
   └─ Stacked modals

Desktop (lg+: 969px)
├─ Navbar as fixed sidebar (300px wide)
│  ├─ Collapsible to icon-only (92px)
│  ├─ Fixed position
│  └─ Full height
│
└─ Content area (flex: 1)
   ├─ Multi-column grids
   ├─ Side-by-side layouts
   └─ Full width available
```

