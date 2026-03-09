import publicDriveFolderIngestService, { extractFolderId, themeFromName, recommendedTemplateGroups } from '../../services/publicDriveFolderIngestService.js';

describe('Public Drive Folder Ingest Service', () => {
  test('extracts folder id from public drive URL', () => {
    expect(extractFolderId('https://drive.google.com/drive/folders/1PlCs1HxhzulF8tzO80wiJSVM2fzAhI7A')).toBe('1PlCs1HxhzulF8tzO80wiJSVM2fzAhI7A');
  });

  test('maps detected themes to recommended template groups', () => {
    expect(themeFromName('500-Plus-Funny-Animal-Reels')).toBe('funny-animal');
    expect(recommendedTemplateGroups('product')).toContain('marketing');
  });

  test('ranks a compatible public sub-video candidate for template context', () => {
    const manifest = {
      files: [
        { id: '1', name: 'luxury-car-reel.mp4', mimeType: 'video/mp4', theme: 'luxury', path: ['Video Reels', '500-Luxury-Car-Videos', 'luxury-car-reel.mp4'], recommendedTemplateGroups: ['marketing', 'cinematic', 'shorts'] },
        { id: '2', name: 'funny-cat.mp4', mimeType: 'video/mp4', theme: 'funny-animal', path: ['Video Reels', '500-Plus-Funny-Animal-Reels', 'funny-cat.mp4'], recommendedTemplateGroups: ['reaction', 'meme', 'shorts'] },
      ],
    };

    const result = publicDriveFolderIngestService.selectBestSubVideo(manifest, {
      templateName: '086-cta-overlay',
      sourceTitle: 'Luxury car product hook',
      affiliateKeywords: ['luxury', 'car'],
      aspectRatio: '9:16',
    });

    expect(result.success).toBe(true);
    expect(result.templateGroup).toBe('marketing');
    expect(['luxury', 'funny-animal']).toContain(result.file.theme);
    expect(result.candidates.length).toBeGreaterThan(0);
  });

  test('recurses nested public folder pages and builds manifest summary', async () => {
    const rootId = '1PlCs1HxhzulF8tzO80wiJSVM2fzAhI7A';
    const childId = '1Qy8BiDT7firEJnR3GaS3-_3U4LWpazsi';
    const rootHtml = `<title>Video Reels - Google Drive</title>\\x22${childId}\\x22,\\x5b\\x22${rootId}\\x22\\x5d,\\x22male-fitness-100+\\x22,\\x22application\\/vnd.google-apps.folder\\x22,0,null`;
    const childFileId = '1abcdeFGHIJKLMNOPQRSTU';
    const childHtml = `<title>male-fitness-100+ - Google Drive</title>\\x22${childFileId}\\x22,\\x5b\\x22${childId}\\x22\\x5d,\\x22clip-001.mp4\\x22,\\x22video\\/mp4\\x22,0,null`;

    const originalFetch = publicDriveFolderIngestService.fetchFolderPage.bind(publicDriveFolderIngestService);
    publicDriveFolderIngestService.fetchFolderPage = async (folderId) => {
      if (folderId === rootId) return { folderId, url: `https://drive.google.com/drive/folders/${folderId}`, html: rootHtml, title: 'Video Reels' };
      if (folderId === childId) return { folderId, url: `https://drive.google.com/drive/folders/${folderId}`, html: childHtml, title: 'male-fitness-100+' };
      throw new Error(`Unexpected folder ${folderId}`);
    };

    try {
      const result = await publicDriveFolderIngestService.analyzePublicFolder({ folderId: rootId, maxDepth: 3 });

      expect(result.success).toBe(true);
      expect(result.stats.visitedFolders).toBe(2);
      expect(result.stats.videoFiles).toBe(1);
      expect(result.themeSummary.some((item) => item.theme === 'fitness')).toBe(true);
      expect(result.overallTemplateGroupFit.some((item) => item.groupKey === 'marketing')).toBe(true);
      expect(result.folders.some((item) => item.name === 'male-fitness-100+')).toBe(true);
    } finally {
      publicDriveFolderIngestService.fetchFolderPage = originalFetch;
    }
  });
});
