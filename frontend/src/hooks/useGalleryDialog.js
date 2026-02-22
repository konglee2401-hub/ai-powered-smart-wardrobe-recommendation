/**
 * Gallery Dialog Integration Examples
 * Shows how to use the GalleryDialog component across the application
 */

// Example 1: Simple Image Upload Component
export function ImageUploadPage() {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageSelected = (imageData) => {
    setSelectedImage(imageData);
    console.log('Selected image:', imageData);
    // Use the selected image
    updateProfilePicture(imageData);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setGalleryOpen(true)}
        className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
      >
        Select Profile Image
      </button>

      {selectedImage && (
        <div>
          <img src={selectedImage.thumbnail} alt="Selected" className="w-32 h-32" />
          <p>{selectedImage.name}</p>
        </div>
      )}

      <GalleryDialog
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleImageSelected}
        allowedTypes={['image']}
        multiSelect={false}
        mode="select"
        title="Select Profile Image"
      />
    </div>
  );
}

// Example 2: Multiple Video/Audio Upload for Batch Processing
export function BatchMediaUploadPage() {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);

  const handleMediaSelected = (mediaList) => {
    setSelectedMedia(mediaList);
    console.log('Selected media:', mediaList);
    // Process batch upload
    startBatchProcessing(mediaList);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button
          onClick={() => setGalleryOpen(true)}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Select Media for Batch ({selectedMedia.length} selected)
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {selectedMedia.map((media) => (
          <div key={media.id} className="border rounded p-4">
            {media.thumbnail && <img src={media.thumbnail} alt={media.name} />}
            <p className="mt-2">{media.name}</p>
          </div>
        ))}
      </div>

      <GalleryDialog
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleMediaSelected}
        allowedTypes={['video', 'audio']}
        multiSelect={true}
        mode="select"
        title="Select Videos/Audio for Batch Processing"
      />
    </div>
  );
}

// Example 3: Video Generation with Media Selection
export function VideoGenerationPage() {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [referenceMedia, setReferenceMedia] = useState(null);
  const [characterImage, setCharacterImage] = useState(null);

  const handleReferenceSelected = (media) => {
    setReferenceMedia(media);
    console.log('Selected reference:', media);
  };

  const handleCharacterSelected = (media) => {
    setCharacterImage(media);
    console.log('Selected character:', media);
  };

  return (
    <div className="space-y-6">
      {/* Character Image Selection */}
      <div className="border rounded p-4">
        <h3 className="font-bold mb-4">Character Image</h3>
        <button
          onClick={() => {
            // Open gallery with image-only filter for character
            setGalleryOpen({ target: 'character' });
          }}
          className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
        >
          Select Character Image
        </button>
        {characterImage && (
          <img src={characterImage.thumbnail} alt="Character" className="mt-4 w-32" />
        )}
      </div>

      {/* Reference Media Selection */}
      <div className="border rounded p-4">
        <h3 className="font-bold mb-4">Reference Media</h3>
        <button
          onClick={() => {
            // Open gallery for reference video/image
            setGalleryOpen({ target: 'reference' });
          }}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Select Reference Media
        </button>
        {referenceMedia && (
          <div className="mt-4">
            <p>{referenceMedia.name}</p>
            <p className="text-sm text-gray-400">{referenceMedia.type}</p>
          </div>
        )}
      </div>

      {/* Create Dialog with dynamic target */}
      {galleryOpen && (
        <GalleryDialog
          isOpen={Boolean(galleryOpen)}
          onClose={() => setGalleryOpen(null)}
          onSelect={
            galleryOpen.target === 'character'
              ? handleCharacterSelected
              : handleReferenceSelected
          }
          allowedTypes={
            galleryOpen.target === 'character'
              ? ['image']
              : ['image', 'video']
          }
          multiSelect={false}
          mode="select"
          title={
            galleryOpen.target === 'character'
              ? 'Select Character Image'
              : 'Select Reference Media'
          }
        />
      )}
    </div>
  );
}

// Example 4: Audio Selection for Video Generation
export function AudioSelectionPage() {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(null);

  const handleAudioSelected = (audio) => {
    setSelectedAudio(audio);
    console.log('Selected audio:', audio);
    // Apply audio to video
    applyAudioToVideo(audio);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Select Background Music</h3>
      
      <button
        onClick={() => setGalleryOpen(true)}
        className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
      >
        {selectedAudio ? `Playing: ${selectedAudio.name}` : 'Select Audio'}
      </button>

      <GalleryDialog
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleAudioSelected}
        allowedTypes={['audio']}
        multiSelect={false}
        mode="select"
        title="Select Background Music"
      />
    </div>
  );
}

// Example 5: Combined Upload & Selection Component
export function MediaManagementPage() {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryMode, setGalleryMode] = useState('select'); // 'select' or 'upload'
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFilesSelected = (files) => {
    if (galleryMode === 'upload') {
      setUploadedFiles(prev => [...prev, ...Array.isArray(files) ? files : [files]]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <button
          onClick={() => {
            setGalleryMode('upload');
            setGalleryOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Upload New Media
        </button>
        
        <button
          onClick={() => {
            setGalleryMode('select');
            setGalleryOpen(true);
          }}
          className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
        >
          Select Existing Media
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {uploadedFiles.map((file) => (
          <div key={file.id} className="border rounded overflow-hidden">
            {file.thumbnail && (
              <img src={file.thumbnail} alt={file.name} className="w-full h-32 object-cover" />
            )}
            <div className="p-2">
              <p className="text-sm truncate">{file.name}</p>
            </div>
          </div>
        ))}
      </div>

      <GalleryDialog
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onSelect={handleFilesSelected}
        allowedTypes={['image', 'video', 'audio', 'file']}
        multiSelect={galleryMode === 'upload'}
        mode={galleryMode}
        title={galleryMode === 'upload' ? 'Upload Media' : 'Select Media'}
      />
    </div>
  );
}

/* ==========================================
   INTEGRATION INSTRUCTIONS
   ========================================== */

/**
 * To use GalleryDialog in any component:
 *
 * 1. Import the component:
 *    import { GalleryDialog } from '@/components/GalleryDialog';
 *
 * 2. Add state for dialog control:
 *    const [galleryOpen, setGalleryOpen] = useState(false);
 *    const [selectedMedia, setSelectedMedia] = useState(null);
 *
 * 3. Create handler for selection:
 *    const handleMediaSelected = (media) => {
 *      setSelectedMedia(media);
 *      // Use the selected media
 *    };
 *
 * 4. Add button to open dialog:
 *    <button onClick={() => setGalleryOpen(true)}>
 *      Select Media
 *    </button>
 *
 * 5. Add the GalleryDialog component:
 *    <GalleryDialog
 *      isOpen={galleryOpen}
 *      onClose={() => setGalleryOpen(false)}
 *      onSelect={handleMediaSelected}
 *      allowedTypes={['image', 'video']}
 *      multiSelect={false}
 *      mode="select"
 *      title="Select Media"
 *    />
 *
 * PROPS:
 * - isOpen (boolean): Control dialog visibility
 * - onClose (function): Called when dialog closes
 * - onSelect (function): Called with selected media(s)
 * - allowedTypes (array): ['image', 'video', 'audio', 'file']
 * - multiSelect (boolean): Allow multiple selections
 * - mode (string): 'select' or 'upload'
 * - title (string): Dialog title
 */

// Usage in existing components:

// ProfilePage.jsx
export function ProfilePage() {
  return (
    <div>
      <ProfileImageUpload />
      {/* Gallery Dialog will open when needed */}
    </div>
  );
}

// VideoEditorPage.jsx
export function VideoEditorPage() {
  return (
    <div>
      <VideoGenerationPage />
      {/* User can select reference media and character from same dialog */}
    </div>
  );
}

// UploadCenterPage.jsx
export function UploadCenterPage() {
  return (
    <div>
      <MediaManagementPage />
      {/* Upload and manage all media types in one place */}
    </div>
  );
}
