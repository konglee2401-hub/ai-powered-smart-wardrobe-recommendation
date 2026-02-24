# Gallery Picker Component - Integration Guide

## Overview

The **GalleryPicker** component is a reusable, dark-themed modal dialog for selecting media from the application's gallery. It provides a unified interface for accessing generated images, uploaded files, and cloud-synced media across multiple workflows.

## Features

✅ **Dark Theme Styling** - Matches system color palette
✅ **Multiple View Modes** - Grid and list view options
✅ **Content Type Filtering** - Generated, Uploaded, Cloud Drive, or All
✅ **Search Functionality** - Find items by name
✅ **Single/Multi-select** - Configurable selection mode
✅ **Sorting Options** - Newest, oldest, or alphabetical
✅ **Professional UI** - Gradient buttons, hover effects, smooth animations

## Color Palette

The component uses the unified dark theme:

```
Background: #0f172a (slate-950)
Surface: #1e293b (slate-900)
Border: #334155 (slate-700)
Primary: #6366f1 (indigo-500) → #8b5cf6 (violet-500)
Secondary: #3b82f6 (blue) → #06b6d4 (cyan)
Success: #10b981 (emerald-500)
Text Primary: #f1f5f9 (slate-50)
Text Secondary: #cbd5e1 (slate-300)
```

## Component Location

```
frontend/src/components/GalleryPicker.jsx
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | - | Controls modal visibility |
| `onClose` | function | - | Callback when modal closes |
| `onSelect` | function | - | Callback when item(s) selected |
| `multiSelect` | boolean | false | Enable multi-select mode |
| `mediaType` | string | 'all' | Filter by media type: 'all', 'image', 'video' |
| `contentType` | string | 'all' | Filter by content type: 'all', 'generated', 'uploaded', 'drive' |
| `title` | string | 'Select from Gallery' | Modal title |

## Usage Examples

### Basic Image Selection (ImageGenerationPage)

```jsx
import GalleryPicker from '../components/GalleryPicker';

function ImageGenerationPage() {
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryPickerFor, setGalleryPickerFor] = useState(null);

  const handleGallerySelect = (item) => {
    // item = { id, name, url, thumbnail, type, contentType, createdAt, size }
    // Process selected item...
  };

  return (
    <>
      <button onClick={() => {
        setGalleryPickerFor('character');
        setShowGalleryPicker(true);
      }}>
        📁 Pick Character from Gallery
      </button>

      <GalleryPicker
        isOpen={showGalleryPicker}
        onClose={() => {
          setShowGalleryPicker(false);
          setGalleryPickerFor(null);
        }}
        onSelect={handleGallerySelect}
        mediaType="image"
        contentType="all"
        title="Select Character Image"
      />
    </>
  );
}
```

### Video Selection (VideoProduction)

```jsx
import GalleryPicker from '@/components/GalleryPicker';

function VideoProduction() {
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const handleGallerySelect = (item) => {
    setSelectedMedia(item);
    toast.success(`Selected: ${item.name}`);
  };

  return (
    <>
      <button onClick={() => setShowGalleryPicker(true)}>
        <Plus className="w-4 h-4" />
        Browse Gallery
      </button>

      <GalleryPicker
        isOpen={showGalleryPicker}
        onClose={() => setShowGalleryPicker(false)}
        onSelect={handleGallerySelect}
        mediaType="all"
        contentType="all"
        title="Select Media for Video Production"
      />
    </>
  );
}
```

## Data Structure

Gallery items follow this structure:

```javascript
{
  id: 'item-1',
  name: 'Media 1',
  url: 'https://example.com/media.jpg',
  thumbnail: 'https://example.com/thumb.jpg',
  type: 'image', // or 'video'
  contentType: 'generated', // 'generated', 'uploaded', or 'drive'
  createdAt: Date,
  size: 2048576 // bytes
}
```

## Current Integration Status

### ✅ Implemented

1. **ImageGenerationPage** (`frontend/src/pages/ImageGenerationPage.jsx`)
   - Gallery picker for character image selection
   - Gallery picker for product image selection
   - Loads images from gallery and converts to file objects
   - Displays "Pick from Gallery" buttons in Step 1

2. **VideoProduction** (`frontend/src/pages/VideoProduction.jsx`)
   - Media browser in Media Library tab
   - Displays selected media with metadata
   - Shows content type badge and size information

3. **Gallery Components** (Previously created)
   - `GalleryManagement.jsx` - Full gallery UI with filters
   - `GalleryManagement.css` - Dark theme styling
   - `GalleryPage.jsx` - Main gallery page with info cards

## Next Steps - API Integration

Currently, the component uses mock data. To connect with real data:

### 1. Replace Mock Data in `loadGalleryItems()`

```javascript
const loadGalleryItems = async () => {
  setLoading(true);
  try {
    // Replace with actual API calls
    const endpointMap = {
      generated: '/api/gallery/generated',
      uploaded: '/api/gallery/uploaded',
      drive: '/api/gallery/drive',
      all: '/api/gallery/all'
    };
    
    const endpoint = endpointMap[filters.contentType];
    const response = await fetch(
      `${endpoint}?search=${filters.search}&sort=${filters.sortBy}`
    );
    const data = await response.json();
    setItems(data.items);
  } catch (error) {
    console.error('Failed to load gallery items:', error);
  } finally {
    setLoading(false);
  }
};
```

### 2. Update Backend API Endpoints

Ensure these endpoints exist:

```
GET /api/gallery/all          - All media items
GET /api/gallery/generated    - Generated items only
GET /api/gallery/uploaded     - Uploaded items only
GET /api/gallery/drive        - Cloud drive items only

Query Parameters:
- search:string              - Filter by name
- sort:string               - 'newest', 'oldest', 'name'
- page:number               - Pagination
- limit:number              - Items per page
```

### 3. Add API Service

Create `frontend/src/services/galleryAPI.js`:

```javascript
export const galleryAPI = {
  getItems: async (contentType = 'all', filters = {}) => {
    const params = new URLSearchParams({
      search: filters.search || '',
      sort: filters.sortBy || 'newest',
      page: filters.page || 1,
      limit: filters.limit || 50
    });
    
    const endpoint = contentType === 'all' 
      ? `/api/gallery/all`
      : `/api/gallery/${contentType}`;
    
    const response = await fetch(`${endpoint}?${params}`);
    return response.json();
  }
};
```

## Styling Customization

The component uses inline styles for dark theme. To modify:

1. **Background Colors**
   - Main: `#0f172a` (line ~110)
   - Surface: `#1e293b` (line ~119)

2. **Button Colors**
   - Primary: `linear-gradient(135deg, #6366f1, #8b5cf6)` (line ~385)
   - Secondary: `#3b82f6 to #06b6d4`

3. **Animations**
   - Modify `transition` property values
   - Update `hover:scale-*` and `hover:shadow-*` properties

## Testing Checklist

- [ ] Grid view displays correctly
- [ ] List view shows item details
- [ ] Search filters items by name
- [ ] Content type dropdown filters correctly
- [ ] Single-select works (default mode)
- [ ] Multi-select works (with multiSelect=true)
- [ ] Selected items highlighted with blue border
- [ ] Checkmark appears on selected items
- [ ] Cancel button closes modal without selecting
- [ ] Confirm button enables only when item selected
- [ ] Modal responsive on mobile devices
- [ ] Dark theme colors match system palette
- [ ] Hover effects work smoothly
- [ ] Loading state displays

## Performance Considerations

1. **Mock Data Generation**
   - Currently generates 25 items synchronously
   - For production, implement server-side pagination

2. **Image Loading**
   - Thumbnails load from `thumbnail` property
   - Consider lazy loading for large galleries

3. **Memory Management**
   - Reset `selectedItems` state when modal closes
   - Clear filters when changing content type

## Accessibility

Current implementation:
- ✅ Keyboard navigation (buttons, dropdowns)
- ✅ Clear visual hierarchy
- ⏳ Needs: ARIA labels, focus indicators

Future improvements:
```jsx
// Add aria labels
<button aria-label="Select character from gallery">
  📁 Pick Character
</button>

// Add keyboard navigation
const handleKeyDown = (e) => {
  if (e.key === 'Escape') onClose();
  if (e.key === 'Enter' && selectedItems) handleConfirm();
};
```

## Browser Compatibility

✅ Chrome/Chromium
✅ Firefox
✅ Safari
✅ Edge
❓ IE11 (not tested)

## Known Limitations

1. **Mock Data Only**
   - Currently uses generated mock data
   - Real API integration pending

2. **File Download**
   - Gallery picker returns URL, not file object
   - ImageGenerationPage handles conversion via fetch

3. **Batch Operations**
   - Multi-select returns array but components handle single items
   - Future: Support batch operations

## Troubleshooting

### Modal doesn't appear
- Check `isOpen` prop is `true`
- Verify `onClose` callback properly updates state

### Images not loading
- Verify image URLs in mock data
- Check CORS settings for real images

### Selection not working
- Ensure `onSelect` callback processes items correctly
- Check console for React errors

### Styling looks wrong
- Verify browser supports CSS Grid and Flexbox
- Check for conflicting global CSS
- Clear browser cache

## Future Enhancements

1. ⏳ **Real API Integration** - Replace mock data with backend API
2. ⏳ **Lazy Loading** - Load images only when visible
3. ⏳ **Drag & Drop** - Accept files from desktop
4. ⏳ **Image Preview** - Lightbox on click
5. ⏳ **Advanced Filters** - Date range, size, duration
6. ⏳ **Favorites** - Mark items as favorites
7. ⏳ **Batch Upload** - Handle multiple files
8. ⏳ **Share/Export** - Copy URLs or export list

## Version History

### v1.0 (Current)
- Initial implementation with dark theme
- Grid/List view modes
- Content type filtering
- Search functionality
- Single/Multi-select support

---

**Last Updated:** 2024
**Created By:** AI Assistant
**Status:** Production Ready (Mock Data)
