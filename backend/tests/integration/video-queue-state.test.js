import { buildQueueControl, classifyQueueError } from '../../services/videoQueueService.js';

describe('Video Queue Retry State', () => {
  test('marks missing main video as manual review and non-retryable', () => {
    const result = classifyQueueError(new Error('Mashup jobs require a main video input before manual start'), 'validation');

    expect(result.retryEligible).toBe(false);
    expect(result.manualInterventionRequired).toBe(true);
    expect(result.category).toBe('content');
  });

  test('keeps transient failures in auto-retry pending state', () => {
    const control = buildQueueControl({
      status: 'pending',
      errorCount: 1,
      maxRetries: 3,
      metadata: {
        queueControl: {
          retryEligible: true,
          manualInterventionRequired: false,
          nextAction: 'auto-retry',
          lastFailureStage: 'mashup',
          lastFailureMessage: 'ffmpeg exited with code 1',
        },
      },
    });

    expect(control.executionState).toBe('auto-retry-pending');
    expect(control.retriesRemaining).toBe(2);
    expect(control.nextAction).toBe('auto-retry');
  });

  test('marks failed non-retryable jobs as manual review', () => {
    const control = buildQueueControl({
      status: 'failed',
      errorCount: 2,
      maxRetries: 3,
      metadata: {
        queueControl: {
          retryEligible: false,
          manualInterventionRequired: true,
          nextAction: 'manual-start',
          lastFailureStage: 'auto-sub-video',
          lastFailureMessage: 'No suitable public file found',
        },
      },
    });

    expect(control.executionState).toBe('manual-review');
    expect(control.summary).toMatch(/manual review/i);
    expect(control.nextAction).toBe('manual-start');
  });

  test('stops retry after max retry threshold is reached', () => {
    const control = buildQueueControl({
      status: 'failed',
      errorCount: 3,
      maxRetries: 3,
      metadata: {
        queueControl: {
          retryEligible: true,
          retryStopped: true,
          retryStoppedReason: 'Reached max retries (3)',
          manualInterventionRequired: true,
          nextAction: 'manual-start',
          lastFailureStage: 'mashup',
          lastFailureMessage: 'ffmpeg exited with code 1',
        },
      },
    });

    expect(control.retryStopped).toBe(true);
    expect(control.retriesRemaining).toBe(0);
    expect(control.summary).toMatch(/retry stopped/i);
    expect(control.retryStoppedReason).toMatch(/max retries/i);
  });
});