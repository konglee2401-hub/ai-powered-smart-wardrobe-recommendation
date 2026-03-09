import path from 'path';
import { fileURLToPath } from 'url';
import videoMashupGenerator from '../../services/videoMashupGenerator.js';
import videoMashupService from '../../services/videoMashupService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Video Factory Planning Tests', () => {
  const testVideosDir = path.join(__dirname, '../../test-videos');
  const mainVideoPath = path.join(testVideosDir, 'main-video.mp4');
  const subVideoPath = path.join(testVideosDir, 'sub-video.mp4');

  test('loads default factory templates from in-memory catalog', async () => {
    const reaction = await videoMashupGenerator.loadTemplate('reaction');
    const featured = await videoMashupGenerator.loadTemplate('001-mrbeast-mashup-style');

    expect(reaction.name).toBe('reaction');
    expect(reaction.layout).toBe('split');
    expect(featured.templateId).toBe(1);
    expect(featured.engineTemplate).toBe('meme');
  });

  test('builds subtitle chunks from plain text without external services', () => {
    const subtitles = videoMashupGenerator.buildSubtitlesFromText('Deal hot hom nay link bio mua ngay nhanh len', 9);

    expect(subtitles.length).toBeGreaterThan(0);
    expect(subtitles[0].text.length).toBeGreaterThan(0);
    expect(subtitles[0].startTime).toBe(0);
  });

  test('scores highlight windows from packet spikes', () => {
    const windows = videoMashupGenerator.buildHighlightWindows([
      { time: 0.1, size: 10 },
      { time: 0.2, size: 12 },
      { time: 2.1, size: 500 },
      { time: 2.3, size: 450 },
      { time: 6.2, size: 430 },
      { time: 6.5, size: 410 },
    ], {
      windowSeconds: 1,
      thresholdPercentile: 80,
      clipDuration: 3,
      maxHighlights: 2,
    });

    expect(windows).toHaveLength(2);
    expect(windows[0].startTime).toBeLessThanOrEqual(windows[1].startTime);
  });

  test('creates a dry-run batch plan from explicit clip list', async () => {
    const plan = await videoMashupService.generateBatchMashups({
      mainVideoPath,
      subVideoPaths: [subVideoPath, mainVideoPath],
      outputDir: path.join(__dirname, '../../media/mashups'),
      duration: 6,
      concurrency: 2,
      maxOutputs: 2,
      templateName: 'reaction',
      dryRun: true,
    });

    expect(plan.success).toBe(true);
    expect(plan.dryRun).toBe(true);
    expect(plan.totalPlanned).toBe(2);
    expect(plan.items[0].outputPath.endsWith('.mp4')).toBe(true);
  });

  test('factory templates are exposed via catalog without disk materialization', () => {
    const catalog = videoMashupService.listFactoryTemplates();

    expect(catalog).toHaveLength(100);
    expect(catalog[0].code).toBe('T001');
    expect(catalog[99].code).toBe('T100');
    expect(catalog[0].slug).toBe('001-mrbeast-mashup-style');
    expect(catalog[99].slug).toBe('100-twist-ending');
  });
});


