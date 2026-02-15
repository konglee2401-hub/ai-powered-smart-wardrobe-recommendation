# 🎨 AI Product Photography Generator - Frontend

> Full-stack AI-powered product photography generation system with comprehensive API integration

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Integration](#api-integration)
- [Usage](#usage)
- [Components](#components)
- [Services](#services)
- [Deployment](#deployment)

---

## ✨ Features

### 🎯 Core Features
- ✅ **AI Product Photo Generation** - Generate professional product photos with AI
- ✅ **Multiple Presets** - E-commerce, Fashion, Luxury, Lifestyle, Studio
- ✅ **Custom Options** - Full control over quality, style, lighting, background, etc.
- ✅ **Model Integration** - Optional model image for fashion photography
- ✅ **Real-time Progress** - Live progress tracking during generation

### 📊 Advanced Features
- ✅ **Generation History** - View, search, filter, and manage all generations
- ✅ **Statistics Dashboard** - Comprehensive analytics and performance metrics
- ✅ **Provider Testing** - Test and compare different AI providers
- ✅ **Prompt Builder** - Create and manage prompt templates
- ✅ **Batch Operations** - Delete, export, regenerate multiple items
- ✅ **AI Analysis** - Quality scoring and improvement suggestions

### 🎨 UI/UX Features
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Dark Mode Ready** - Prepared for dark mode implementation
- ✅ **Loading States** - Smooth loading animations
- ✅ **Error Handling** - User-friendly error messages
- ✅ **Toast Notifications** - Success/error notifications
- ✅ **Image Preview** - Fullscreen image viewer with zoom

---

## 🛠 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Axios** - HTTP client with interceptors
- **Zustand** - State management (optional)
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library

### Backend Integration
- **RESTful API** - Backend API on port 5000
- **Axios Interceptors** - Request/response handling
- **Retry Logic** - Automatic retry for failed requests
- **File Upload** - FormData for image uploads
- **Error Handling** - Centralized error management

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── config/
│   │   └── api.js                          # API configuration
│   ├── services/
│   │   ├── axios.js                        # Axios instance with interceptors
│   │   ├── productPhotoService.js          # Product photo API calls
│   │   ├── historyService.js               # History API calls
│   │   ├── statsService.js                 # Statistics API calls
│   │   ├── promptTemplateService.js        # Prompt template API calls
│   │   └── api.js                          # API helper functions
│   ├── components/
│   │   ├── Navbar.jsx                      # Navigation bar
│   │   ├── ImageUpload.jsx                 # Image upload component
│   │   ├── StyleOptions.jsx                # Style options selector
│   │   ├── GeneratedResult.jsx             # Result display with actions
│   │   ├── AIAnalysis.jsx                  # AI analysis display
│   │   ├── GeneratedPrompt.jsx             # Prompt display
│   │   ├── NegativePrompt.jsx              # Negative prompt display
│   │   └── SaveOptionsModal.jsx           # Save options modal
│   ├── pages/
│   │   ├── UnifiedVideoGeneration.jsx      # Main generation page
│   │   ├── GenerationHistory.jsx           # History page
│   │   ├── ModelStats.jsx                 # Statistics page
│   │   ├── ModelTester.jsx                # Provider testing page
│   │   ├── PromptBuilder.jsx              # Prompt builder page
│   │   ├── Dashboard.jsx                  # Dashboard overview
│   │   └── Login.jsx                      # Login page
│   ├── App.jsx                            # Main app component
│   ├── main.jsx                           # Entry point
│   └── index.css                          # Global styles
├── public/
├── .env                                   # Environment variables
├── .env.example                          # Environment variables example
├── package.json                          # Dependencies
├── vite.config.js                        # Vite configuration
├── tailwind.config.js                    # Tailwind configuration
├── postcss.config.js                     # PostCSS configuration
└── README.md                             # This file
```

---

## 🚀 Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- Backend API running on port 5000

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd frontend
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_N8N_WEBHOOK_URL=
VITE_ENV=development
```

4. **Start development server**
```bash
npm run dev
# or
yarn dev
```

5. **Open browser**
```
http://localhost:3000
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:5000` |
| `VITE_N8N_WEBHOOK_URL` | N8N webhook URL (optional) | - |
| `VITE_ENV` | Environment | `development` |

### API Configuration

Edit `src/config/api.js` to customize:

```javascript
export const API_CONFIG = {
  TIMEOUT: 120000,              // 2 minutes
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],
  },
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  },
};
```

---

## 🔌 API Integration

### API Endpoints

All endpoints are defined in `src/config/api.js`:

#### Product Photography
- `POST /api/generate` - Generate product photo
- `GET /api/options` - Get available options
- `GET /api/providers` - Get provider status
- `POST /api/test` - Test provider

#### History
- `GET /api/history` - Get history with filters
- `GET /api/history/:id` - Get specific history item
- `DELETE /api/history/:id` - Delete history item
- `POST /api/history/:id/regenerate` - Regenerate from history

#### Statistics
- `GET /api/stats` - Get overall statistics
- `GET /api/stats/providers` - Get provider statistics
- `GET /api/stats/usage` - Get usage statistics

#### Prompt Templates
- `GET /api/prompts/templates` - Get all templates
- `POST /api/prompts/templates` - Create template
- `PUT /api/prompts/templates/:id` - Update template
- `DELETE /api/prompts/templates/:id` - Delete template

### Service Layer

#### Product Photo Service
```javascript
import { generateProductPhoto, generateWithPreset } from './services/productPhotoService';

// Generate with custom options
const result = await generateProductPhoto(
  productImage,
  modelImage,
  {
    quality: 'high',
    style: 'professional',
    lighting: 'studio',
    background: 'white',
  },
  (progress) => {
    console.log('Progress:', progress.progress);
  }
);

// Generate with preset
const result = await generateWithPreset(
  productImage,
  modelImage,
  'ecommerce'
);
```

#### History Service
```javascript
import { getHistory, deleteHistory, regenerateFromHistory } from './services/historyService';

// Get history with filters
const result = await getHistory({
  status: 'completed',
  provider: 'replicate',
  limit: 20,
  offset: 0,
});

// Delete history item
await deleteHistory(id);

// Regenerate from history
await regenerateFromHistory(id, { quality: 'ultra' });
```

#### Stats Service
```javascript
import { getOverallStats, getProviderStats, getUsageStats } from './services/statsService';

// Get overall statistics
const stats = await getOverallStats();

// Get provider statistics
const providerStats = await getProviderStats();

// Get usage statistics
const usageStats = await getUsageStats('7d');
```

---

## 📖 Usage

### 1. Generate Product Photo

1. Navigate to home page (`/`)
2. Upload product image (required)
3. Upload model image (optional for fashion)
4. Select preset or customize options
5. Click "Tạo Ảnh AI"
6. Wait for generation (10-60 seconds)
7. Download or regenerate result

### 2. View History

1. Navigate to History page (`/history`)
2. Use filters to search:
   - Status (completed, failed, processing)
   - Provider
   - Date range
   - Search keyword
3. View, download, regenerate, or delete items
4. Select multiple items for batch operations

### 3. View Statistics

1. Navigate to Stats page (`/stats`)
2. View overall statistics:
   - Total generations
   - Success rate
   - Average time
   - Failed count
3. View provider statistics
4. View usage over time chart
5. Select time range (7d, 30d, 90d, 1y)

### 4. Test Providers

1. Navigate to Tester page (`/tester`)
2. Select provider from list
3. Click "Quick Test" for basic test
4. Or upload image and click "Run Full Test"
5. View test results with duration

### 5. Manage Prompt Templates

1. Navigate to Prompt Builder page (`/prompt-builder`)
2. View existing templates
3. Create new template
4. Edit or delete templates
5. Export/import templates

---

## 🧩 Components

### ImageUpload
Reusable image upload component with preview and validation.

```jsx
<ImageUpload
  image={imagePreview}
  onUpload={handleUpload}
  onRemove={handleRemove}
  label="Upload Image"
  accept="image/jpeg,image/png"
  maxSize={10 * 1024 * 1024}
/>
```

### StyleOptions
Display and manage generation options.

```jsx
<StyleOptions
  options={generationOptions}
  onChange={handleOptionChange}
  availableOptions={availableOptions}
/>
```

### GeneratedResult
Display generated image with actions.

```jsx
<GeneratedResult
  image={generatedImage}
  metadata={metadata}
  onDownload={handleDownload}
  onCopy={handleCopy}
  onRegenerate={handleRegenerate}
  onReset={handleReset}
/>
```

### AIAnalysis
Display AI analysis and quality metrics.

```jsx
<AIAnalysis
  originalImage={originalImage}
  generatedImage={generatedImage}
  metadata={metadata}
/>
```

---

## 🔧 Services

### Axios Instance
Centralized axios instance with interceptors for:
- Authentication (Bearer token)
- Request/response logging
- Automatic retry logic
- Error handling
- Progress tracking

### Error Handling
All services use try-catch with user-friendly error messages:

```javascript
try {
  const result = await generateProductPhoto(...);
  // Handle success
} catch (error) {
  // error.message contains user-friendly message
  console.error(error);
}
```

### File Upload
Helper functions for file handling:

```javascript
import { validateImageFile, createFormData, blobUrlToFile } from './services/axios';

// Validate image
validateImageFile(file);

// Create FormData
const formData = createFormData({
  productImage: file,
  options: { quality: 'high' },
});

// Convert blob URL to File
const file = await blobUrlToFile(blobUrl, 'image.jpg');
```

---

## 📦 Build & Deployment

### Build for Production

```bash
npm run build
# or
yarn build
```

Output: `dist/` directory

### Preview Production Build

```bash
npm run preview
# or
yarn preview
```

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy `dist/` folder to Netlify

3. Set environment variables in Netlify dashboard

### Deploy to Custom Server

1. Build the project:
```bash
npm run build
```

2. Copy `dist/` folder to server

3. Configure Nginx:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. API Connection Error
**Problem:** Cannot connect to backend API

**Solution:**
- Check if backend is running on port 5000
- Verify `VITE_API_URL` in `.env`
- Check CORS settings in backend

#### 2. Image Upload Fails
**Problem:** Image upload returns error

**Solution:**
- Check file size (max 10MB)
- Check file type (JPG, PNG, WEBP only)
- Verify backend upload endpoint

#### 3. Generation Timeout
**Problem:** Generation takes too long and times out

**Solution:**
- Increase timeout in `src/config/api.js`
- Check backend processing time
- Verify provider API keys

#### 4. Build Errors
**Problem:** Build fails with errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

---

## 📝 Development Guidelines

### Code Style
- Use functional components with hooks
- Follow React best practices
- Use Tailwind CSS for styling
- Keep components small and reusable
- Add JSDoc comments for functions

### File Naming
- Components: PascalCase (e.g., `ImageUpload.jsx`)
- Services: camelCase (e.g., `productPhotoService.js`)
- Pages: PascalCase (e.g., `GenerationHistory.jsx`)
- Utilities: camelCase (e.g., `formatDate.js`)

### State Management
- Use React hooks for local state
- Use Zustand for global state (optional)
- Keep state close to where it's used

### API Calls
- Always use service layer
- Handle loading states
- Handle errors gracefully
- Show user-friendly messages

---

## 🎯 Roadmap

### Phase 1 (Current) ✅
- [x] Product photo generation
- [x] History management
- [x] Statistics dashboard
- [x] Provider testing
- [x] Prompt templates

### Phase 2 (Next)
- [ ] User authentication
- [ ] Team collaboration
- [ ] Advanced analytics
- [ ] Batch generation
- [ ] API rate limiting display

### Phase 3 (Future)
- [ ] Video generation
- [ ] 3D product visualization
- [ ] AR preview
- [ ] Mobile app
- [ ] Webhook integrations

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👥 Contributors

- Your Name - Initial work

---

## 🙏 Acknowledgments

- React team for amazing framework
- Vite team for blazing fast build tool
- Tailwind CSS for utility-first CSS
- Lucide for beautiful icons

---

## 📞 Support

For support, email support@yourcompany.com or open an issue on GitHub.

---

**Made with ❤️ by Your Team**
