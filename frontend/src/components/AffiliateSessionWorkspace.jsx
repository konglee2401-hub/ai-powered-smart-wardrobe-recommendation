import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Video } from 'lucide-react';
import AIImage from './AIImage';

const normalizeHashtag = (tag) => `#${String(tag || '').replace(/^#+/, '').trim()}`;
const resolveMediaSrc = (item) => item?.href || item?.url || item?.path || item?.driveUrl || null;
const formatJsonText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
};

const getSessionFrameLibrary = (session) => {
  if (Array.isArray(session.step2Items) && session.step2Items.length > 0) return session.step2Items;

  const fallbackItems = [];
  if (session.step2Images?.wearing) fallbackItems.push({ key: 'wearing', label: 'Wearing', status: 'completed', path: session.step2Images.wearing, href: session.step2Images.wearing });
  if (session.step2Images?.holding) fallbackItems.push({ key: 'holding', label: 'Holding', status: 'completed', path: session.step2Images.holding, href: session.step2Images.holding });
  return fallbackItems;
};

const getSessionVideoLibrary = (session) => {
  if (Array.isArray(session.step4Items) && session.step4Items.length > 0) return session.step4Items;

  return (session.videos || []).map((video, idx) => ({
    key: `segment-${idx + 1}`,
    label: `Segment ${idx + 1}`,
    status: 'completed',
    path: typeof video === 'string' ? video : (video?.path || video?.href || video?.url),
    href: typeof video === 'string' ? video : (video?.href || video?.url || video?.path),
  }));
};

const getSessionScriptsText = (session) => {
  const scripts = session.analysis?.videoScripts || [];
  if (!scripts.length) return '';

  return scripts
    .map((segment, idx) => {
      const title = segment.segment || `Segment ${idx + 1}`;
      const duration = segment.duration ? ` [${segment.duration}s]` : '';
      return `${title}${duration}\n${segment.script || ''}`.trim();
    })
    .join('\n\n');
};

function SessionStatusPill({ status, label }) {
  const styles = {
    completed: 'apple-option-chip border-emerald-400/35 bg-emerald-500/12 text-emerald-700',
    inProgress: 'apple-option-chip border-amber-400/35 bg-amber-500/12 text-amber-700',
    error: 'apple-option-chip border-rose-400/35 bg-rose-500/12 text-rose-700',
    pending: 'apple-option-chip text-slate-600',
  };

  return <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${styles[status] || styles.pending}`}>{label}</span>;
}

function CopyInlineButton({ value }) {
  if (!value) return null;

  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(value)}
      className="apple-option-chip inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:text-slate-900"
      title="Copy"
    >
      <FileText className="h-3.5 w-3.5" />
    </button>
  );
}

function CollapsibleTextCard({ title, text, badge, rightAction = null, minHeight = 'min-h-[132px]' }) {
  const [expanded, setExpanded] = useState(false);
  const safeText = String(text || '').trim();
  const shouldCollapse = safeText.length > 420;
  const displayText = expanded || !shouldCollapse ? safeText : `${safeText.slice(0, 420).trim()}...`;

  return (
    <div className={`studio-card-shell rounded-2xl p-3 shadow-[0_14px_34px_rgba(100,156,198,0.10)] ${minHeight}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">{title}</h4>
            {badge}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rightAction}
          {shouldCollapse && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="apple-option-chip inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:text-slate-900"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
      {safeText ? (
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-white/35 p-3 text-[12px] leading-6 text-slate-600">{displayText}</pre>
      ) : (
        <div className="flex h-full min-h-[80px] items-center rounded-2xl border border-dashed border-white/45 bg-white/20 px-4 text-[12px] text-slate-500">Waiting for output...</div>
      )}
    </div>
  );
}

function MediaStripCard({ title, items, expectedCount, mediaType = 'image', helperText }) {
  const resolvedExpectedCount = Number.isFinite(expectedCount) ? expectedCount : 0;
  const totalSlots = Math.max(resolvedExpectedCount, items.length || 0, 0);
  const normalizedItems = Array.from({ length: totalSlots }, (_, idx) => items[idx] || null);
  const completedCount = items.filter((item) => item?.status === 'completed' || resolveMediaSrc(item)).length;
  const hasKnownOutputs = totalSlots > 0;

  return (
    <div className="studio-card-shell rounded-2xl p-3 shadow-[0_14px_34px_rgba(100,156,198,0.10)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">{title}</h4>
          {helperText ? <p className="mt-1 text-[11px] text-slate-500">{helperText}</p> : null}
        </div>
        <span className="apple-option-chip rounded-full px-2 py-1 text-[10px] font-semibold text-slate-600">{completedCount}/{totalSlots}</span>
      </div>

      {!hasKnownOutputs ? (
        <div className="rounded-2xl border border-dashed border-white/45 bg-white/20 px-4 py-6 text-[12px] text-slate-500">Waiting for backend to publish output slots...</div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {normalizedItems.map((item, idx) => {
          const src = resolveMediaSrc(item);
          const completed = item?.status === 'completed' || Boolean(src);
          const failed = item?.status === 'failed';

          return (
            <div key={item?.key || `${mediaType}-${idx}`} className="min-w-[160px] max-w-[160px] flex-shrink-0 rounded-2xl border border-white/45 bg-white/22 p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-medium text-slate-700">{item?.label || `${mediaType === 'video' ? 'Segment' : 'Frame'} ${idx + 1}`}</span>
                <SessionStatusPill status={failed ? 'error' : completed ? 'completed' : 'inProgress'} label={failed ? 'Error' : completed ? 'Ready' : 'Generating'} />
              </div>
              <div className="overflow-hidden rounded-xl border border-white/40 bg-white/18">
                {mediaType === 'video' ? (
                  completed && src ? (
                    <video src={src} controls className="h-56 w-full bg-black object-cover" />
                  ) : (
                    <div className="flex h-56 w-full animate-pulse items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(226,239,250,0.28))]">
                      <Video className="h-6 w-6 text-slate-500" />
                    </div>
                  )
                ) : (
                  <AIImage src={completed && src ? src : ''} alt={item?.label || `Output ${idx + 1}`} className="h-56 w-full" imageClassName="object-cover" />
                )}
              </div>
              {item?.error ? <p className="mt-2 text-[11px] text-rose-600">{item.error}</p> : null}
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}

function VoiceoverCard({ session, status }) {
  return (
    <div className="studio-card-shell rounded-2xl p-3 shadow-[0_14px_34px_rgba(100,156,198,0.10)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">Step 5 Voiceover</h4>
        <SessionStatusPill status={status} label={status} />
      </div>
      {session.audioUrl ? (
        <audio controls className="h-10 w-full"><source src={session.audioUrl} /></audio>
      ) : (
        <div className="rounded-xl border border-dashed border-white/45 bg-white/20 px-4 py-3 text-[12px] text-slate-500">{session.ttsText ? 'Voiceover text ready. Audio asset is not exposed in preview yet.' : 'Waiting for voiceover output...'}</div>
      )}
    </div>
  );
}

export function getAffiliateSessionStepStatus(session, stepId) {
  const step = session.steps?.find((item) => item.id === stepId);
  if (!step) return 'pending';
  if (step.error) return 'error';
  if (step.inProgress) return 'inProgress';
  if (step.completed) return 'completed';
  return 'pending';
}

export function getAffiliateSessionRunningStatus(session) {
  return session.error ? 'error' : session.completed ? 'completed' : session.steps?.some((step) => step.inProgress) ? 'inProgress' : 'pending';
}

export { SessionStatusPill };

export default function AffiliateSessionWorkspace({ session }) {
  const frameItems = getSessionFrameLibrary(session);
  const videoItems = getSessionVideoLibrary(session);
  const promptText = session.step1Prompts?.summary || [session.step1Prompts?.wearing, session.step1Prompts?.holding].filter(Boolean).join('\n\n');
  const scriptText = getSessionScriptsText(session);
  const scriptValue = scriptText || session.analysis?.voiceoverScript || '';
  const hashtagText = (session.analysis?.hashtags || []).map(normalizeHashtag).join('\n');
  const analysisText = formatJsonText(session.analysis?.step1);
  const expectedFrameCount = session.step2Progress?.total || session.preview?.step2?.imageCount || frameItems.length;
  const expectedVideoCount = session.step4Progress?.total || session.preview?.step4?.totalCount || videoItems.length;

  return (
    <div className="grid gap-3">
      {session.error && (
        <div className="rounded-2xl border border-rose-300/70 bg-rose-100/60 px-4 py-3 text-rose-900/90">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">Session Failed</p>
          <p className="mt-2 text-[12px] leading-6">{session.error}</p>
          {session.preview?.status ? (
            <p className="mt-1 text-[11px] text-rose-700/80">Last status: {session.preview.status}</p>
          ) : null}
        </div>
      )}

      {session.manualAction && (
        <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Manual Action Required</p>
          <p className="mt-2 text-[12px] leading-6 text-amber-900/80">{session.manualAction.message}</p>
          <p className="mt-1 text-[11px] text-amber-700/80">Resolve it in the opened browser window. The session will resume automatically.</p>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[minmax(300px,0.92fr)_minmax(0,2.08fr)]">
        <div className="grid content-start gap-3">
          <CollapsibleTextCard title="Step 1 Prompt" text={promptText} badge={<SessionStatusPill status={getAffiliateSessionStepStatus(session, 'analyze')} label={getAffiliateSessionStepStatus(session, 'analyze')} />} rightAction={<CopyInlineButton value={promptText} />} minHeight="min-h-[190px]" />
          <CollapsibleTextCard title="Step 1 Analysis" text={analysisText} badge={<SessionStatusPill status={getAffiliateSessionStepStatus(session, 'analyze')} label={getAffiliateSessionStepStatus(session, 'analyze')} />} rightAction={<CopyInlineButton value={analysisText} />} minHeight="min-h-[190px]" />
          <CollapsibleTextCard title="Step 3 Script" text={scriptValue} badge={<SessionStatusPill status={getAffiliateSessionStepStatus(session, 'deep-analysis')} label={getAffiliateSessionStepStatus(session, 'deep-analysis')} />} rightAction={<CopyInlineButton value={scriptValue} />} minHeight="min-h-[220px]" />
          <CollapsibleTextCard title="Hashtags" text={hashtagText} rightAction={<CopyInlineButton value={hashtagText} />} minHeight="min-h-[140px]" />
        </div>

        <div className="grid content-start gap-3">
          <MediaStripCard title="Step 2 Frames" items={frameItems} expectedCount={expectedFrameCount} helperText={`${session.step2Progress?.completed || frameItems.filter((item) => item.status === 'completed').length}/${expectedFrameCount || 0} completed`} />
          <MediaStripCard title="Step 4 Videos" items={videoItems} expectedCount={expectedVideoCount} mediaType="video" helperText={`${session.step4Progress?.completed || videoItems.filter((item) => item.status === 'completed').length}/${expectedVideoCount || 0} completed`} />
          <VoiceoverCard session={session} status={getAffiliateSessionStepStatus(session, 'generate-voiceover')} />
        </div>
      </div>
    </div>
  );
}


