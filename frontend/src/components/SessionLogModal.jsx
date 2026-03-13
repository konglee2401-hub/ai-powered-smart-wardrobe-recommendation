import React, { useEffect, useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import {
  X,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Circle,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  Sparkles,
  Package,
  ExternalLink,
  RefreshCw,
  Database,
  User,
  Hash,
  Clock,
  HardDrive,
  Check,
} from 'lucide-react';
import { VIDEO_SCRIPT_TEMPLATES } from '../constants/videoScriptTemplates';

const formatErrorMessage = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value?.message === 'string') return value.message;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
};

const inferAffiliateStepKey = (flowState, status) => {
  if (flowState?.step6?.completed) return 'step6';
  if (flowState?.step5?.completed) return 'step5';
  if (flowState?.step4?.completed) return 'step4';
  if (flowState?.step3?.completed) return 'step3';
  if (flowState?.step2?.completed) return 'step2';
  if (flowState?.step1?.completed) return 'step1';
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('step6')) return 'step6';
  if (normalized.includes('step5')) return 'step5';
  if (normalized.includes('step4')) return 'step4';
  if (normalized.includes('step3')) return 'step3';
  if (normalized.includes('step2')) return 'step2';
  if (normalized.includes('step1')) return 'step1';
  return 'step1';
};

const AFFILIATE_STEPS = [
  { key: 'step1', label: 'Analyze', icon: Sparkles },
  { key: 'step2', label: 'Images', icon: ImageIcon },
  { key: 'step3', label: 'Scripts', icon: FileText },
  { key: 'step4', label: 'Video', icon: Video },
  { key: 'step5', label: 'Voice', icon: Mic },
  { key: 'step6', label: 'Final', icon: Package },
];

function SessionLogModal({ isOpen, onClose, sessionId, flowId }) {
  const [sessionData, setSessionData] = useState(null);
  const [affiliateStatus, setAffiliateStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState('step1');
  const [copiedId, setCopiedId] = useState(null);
  const [step3TemplateId, setStep3TemplateId] = useState('auto');
  const [step3RerunLoading, setStep3RerunLoading] = useState(false);
  const [step3RerunError, setStep3RerunError] = useState(null);
  const isLightTheme = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';

  const effectiveFlowId = flowId || sessionId;

  useEffect(() => {
    if (!isOpen || !effectiveFlowId) return;
    loadSessionPreview();
  }, [isOpen, effectiveFlowId]);

  useEffect(() => {
    if (!affiliateStatus?.flowState) return;
    const completedSteps = AFFILIATE_STEPS.filter(({ key }) => affiliateStatus.flowState?.[key]?.completed);
    const inferredStep = inferAffiliateStepKey(affiliateStatus.flowState, affiliateStatus.sessionStatus || affiliateStatus.status);
    setActiveStep(completedSteps[completedSteps.length - 1]?.key || inferredStep || 'step1');
    const currentTemplateId = affiliateStatus.flowState?.step3?.metadata?.scriptTemplate?.id || 'auto';
    setStep3TemplateId(currentTemplateId);
  }, [affiliateStatus]);

  const loadSessionPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const [sessionResult, affiliateResult] = await Promise.allSettled([
        fetch(`/api/debug-sessions/${effectiveFlowId}`),
        fetch(`/api/ai/affiliate-video-tiktok/status/${effectiveFlowId}`),
      ]);

      if (sessionResult.status === 'fulfilled' && sessionResult.value.ok) {
        const data = await sessionResult.value.json();
        setSessionData(data.data || data);
      } else {
        setSessionData(null);
      }

      if (affiliateResult.status === 'fulfilled' && affiliateResult.value.ok) {
        const data = await affiliateResult.value.json();
        setAffiliateStatus(data);
      } else {
        setAffiliateStatus(null);
      }

      if (
        (sessionResult.status !== 'fulfilled' || !sessionResult.value.ok) &&
        (affiliateResult.status !== 'fulfilled' || !affiliateResult.value.ok)
      ) {
        throw new Error('Failed to load session preview');
      }
    } catch (err) {
      setError(err.message || 'Failed to load session preview');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, id) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const rerunStep3 = async () => {
    if (!effectiveFlowId) return;
    setStep3RerunLoading(true);
    setStep3RerunError(null);
    try {
      const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const response = await fetch('/api/ai/affiliate-video-tiktok/step-3-deep-analysis', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          flowId: effectiveFlowId,
          scriptTemplateId: step3TemplateId || 'auto'
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to re-run step 3');
      }

      await loadSessionPreview();
      setActiveStep('step3');
    } catch (err) {
      setStep3RerunError(err.message || 'Failed to re-run step 3');
    } finally {
      setStep3RerunLoading(false);
    }
  };

  const isAffiliateMode = Boolean(affiliateStatus?.flowState);

  const summary = useMemo(() => {
    const totalDuration = affiliateStatus?.totalDuration ?? sessionData?.metrics?.totalDuration ?? null;
    const statusValue = affiliateStatus?.sessionStatus || affiliateStatus?.status || sessionData?.status || 'unknown';
    const lastStatus = affiliateStatus?.status || null;
    const errorMessage = formatErrorMessage(affiliateStatus?.error || sessionData?.error);
    return {
      status: statusValue,
      lastStatus,
      errorMessage,
      flowType: sessionData?.flowType || 'affiliate-tiktok',
      totalDuration,
      createdAt: sessionData?.createdAt || null,
      logCount: sessionData?.logs?.length || 0,
    };
  }, [affiliateStatus, sessionData]);

  if (!isOpen) return null;

  const currentStep = affiliateStatus?.flowState?.[activeStep] || null;

  return (
    <ModalPortal>
    <div className={`apple-typography fixed inset-0 app-layer-modal flex items-center justify-center p-4 backdrop-blur-sm ${isLightTheme ? 'bg-[rgba(145,167,193,0.28)]' : 'bg-black/70'}`}>
      <div className={`flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${isLightTheme ? 'studio-card-shell border-white/50' : 'border-slate-700 bg-slate-950'}`}>
        <div className="flex items-start justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
              <Database className="h-3.5 w-3.5" />
              Session Preview
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">Affiliate TikTok Flow</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-slate-700 px-2 py-1">Flow ID: {effectiveFlowId}</span>
              <span className={`rounded-full px-2 py-1 ${summary.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : summary.status === 'failed' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>
                {summary.status}
              {summary.lastStatus && summary.lastStatus !== summary.status ? (<span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300">Last: {summary.lastStatus}</span>) : null}
              </span>
              {summary.totalDuration ? <span>{formatDuration(summary.totalDuration)}</span> : null}
              {summary.createdAt ? <span>{new Date(summary.createdAt).toLocaleString()}</span> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSessionPreview}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex h-48 items-center justify-center gap-3 text-slate-300">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <span>Loading session preview...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">Failed to load session preview</div>
                  <div className="mt-1 text-sm text-red-300">{error}</div>
                </div>
              </div>
            </div>
          ) : isAffiliateMode ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-4">
                <StatCard label="Completed Steps" value={`${AFFILIATE_STEPS.filter(({ key }) => affiliateStatus.flowState?.[key]?.completed).length}/6`} icon={CheckCircle2} />
                <StatCard label="Logs" value={String(summary.logCount || 0)} icon={Database} />
                <StatCard label="Flow Type" value={summary.flowType || 'affiliate-tiktok'} icon={Sparkles} />
                <StatCard label="Duration" value={summary.totalDuration ? formatDuration(summary.totalDuration) : 'Pending'} icon={Clock} />
              </div>
              {(summary.errorMessage || String(summary.status || '').toLowerCase().includes('failed')) ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-rose-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold">Failure Reason</div>
                      <div className="mt-1 text-sm text-rose-200/90">{summary.errorMessage || 'Unknown error'}</div>
                      {summary.lastStatus ? <div className="mt-1 text-xs text-rose-300/80">Last status: {summary.lastStatus}</div> : null}
                    </div>
                  </div>
                </div>
              ) : null}


              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-max items-center gap-2">
                  {AFFILIATE_STEPS.map(({ key, label, icon: Icon }, index) => {
                    const completed = affiliateStatus.flowState?.[key]?.completed;
                    const active = activeStep === key;
                    return (
                      <React.Fragment key={key}>
                        <button
                          onClick={() => setActiveStep(key)}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${active ? 'border-cyan-400 bg-cyan-400/10 text-white' : completed ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}`}
                        >
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? 'bg-cyan-400 text-slate-950' : completed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                            {completed ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                          </span>
                          <span>{index + 1}. {label}</span>
                        </button>
                        {index < AFFILIATE_STEPS.length - 1 ? <div className="h-px w-6 bg-slate-700" /> : null}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                {renderAffiliateStep({
                  activeStep,
                  stepData: currentStep,
                  flowState: affiliateStatus.flowState,
                  copyToClipboard,
                  copiedId,
                })}
              </div>

              {sessionData?.logs?.length ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-100">Recent Logs</div>
                    <button
                      onClick={() => copyToClipboard(sessionData.logs.map((log) => `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.category || 'general'}: ${log.message}`).join('\n'), 'recent-logs')}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedId === 'recent-logs' ? 'Copied' : 'Copy Logs'}
                    </button>
                  </div>
                  <div className="max-h-56 space-y-2 overflow-y-auto text-xs text-slate-300">
                    {sessionData.logs.slice(-12).reverse().map((log, index) => (
                      <div key={`${log.timestamp}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5">{log.category || 'general'}</span>
                          <span className={`rounded-full px-2 py-0.5 ${log.level === 'error' ? 'bg-red-500/15 text-red-300' : log.level === 'warn' ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{log.level}</span>
                        </div>
                        <div className="mt-1 text-slate-200">{log.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <GenericSessionFallback sessionData={sessionData} copyToClipboard={copyToClipboard} copiedId={copiedId} />
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function renderAffiliateStep({ activeStep, stepData, flowState, copyToClipboard, copiedId }) {
  switch (activeStep) {
    case 'step1':
      return (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <SectionTitle title="Analysis Summary" subtitle="Character, product, and AI analysis from step 1" />
            <JsonPanel title="Analysis" value={stepData?.analysis} copyId="step1-analysis" copyToClipboard={copyToClipboard} copiedId={copiedId} />
            <PromptPanel title="Raw Analysis Text" value={stepData?.analysisText} copyId="step1-analysis-text" copyToClipboard={copyToClipboard} copiedId={copiedId} minHeight="min-h-[240px]" />
          </div>
          <div className="space-y-4">
            <SectionTitle title="Input Assets" subtitle="Character and product references used for the flow" />
            <MediaCard media={stepData?.characterImage} title="Character Reference" />
            <MediaCard media={stepData?.productImage} title="Product Reference" />
            <InfoList
              title="Character"
              items={[
                ['Name', stepData?.selectedCharacter?.name],
                ['Alias', stepData?.selectedCharacter?.alias],
                ['Duration', formatSeconds(stepData?.duration)],
              ]}
            />
          </div>
        </div>
      );
    case 'step2':
      return (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <PromptPanel title="Wearing Prompt" value={stepData?.prompts?.wearing} copyId="step2-wearing-prompt" copyToClipboard={copyToClipboard} copiedId={copiedId} />
            <PromptPanel title="Holding Prompt" value={stepData?.prompts?.holding} copyId="step2-holding-prompt" copyToClipboard={copyToClipboard} copiedId={copiedId} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-5 md:grid-cols-2">
              <MediaCard media={stepData?.images?.wearing} title="Wearing Output" showDriveStatus />
              <MediaCard media={stepData?.images?.holding} title="Holding Output" showDriveStatus />
            </div>
            <JsonPanel title="Selected Options" value={stepData?.selectedOptions} copyId="step2-options" copyToClipboard={copyToClipboard} copiedId={copiedId} />
          </div>
        </div>
      );
    case 'step3':
      return (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <PromptPanel title="Deep Analysis Prompt" value={stepData?.deepAnalysisPrompt} copyId="step3-prompt" copyToClipboard={copyToClipboard} copiedId={copiedId} minHeight="min-h-[200px]" />
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Template Selector</div>
                  <div className="mt-1 text-xs text-slate-400">Chọn lại kịch bản và chạy lại Step 3.</div>
                </div>
                <button
                  type="button"
                  onClick={rerunStep3}
                  disabled={step3RerunLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-[11px] font-semibold text-amber-100 transition hover:border-amber-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {step3RerunLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Re-run Step 3
                </button>
              </div>
              <div className="mt-3 grid gap-2">
                {VIDEO_SCRIPT_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setStep3TemplateId(template.id)}
                    className={`rounded-xl border px-3 py-2 text-left text-[11px] transition ${
                      step3TemplateId === template.id
                        ? 'border-sky-400/60 bg-sky-400/10 text-sky-100'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:border-slate-500/60'
                    }`}
                  >
                    <div className="font-semibold">{template.title}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{template.description}</div>
                  </button>
                ))}
              </div>
              {step3RerunError ? (
                <div className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                  {step3RerunError}
                </div>
              ) : null}
            </div>
            <InfoList
              title="Metadata"
              items={[
                ['Language', stepData?.language],
                ['Scripts', String(stepData?.scripts?.length || 0)],
                ['Duration', formatSeconds(stepData?.duration)],
                ['Script Template', stepData?.metadata?.scriptTemplate?.name || stepData?.metadata?.scriptTemplate?.id || ''],
                ['Template Reason', stepData?.metadata?.scriptTemplate?.reason || ''],
                ['Hashtags', Array.isArray(stepData?.hashtags) ? stepData.hashtags.join(', ') : ''],
              ]}
            />
            <TemplateScoringPanel
              items={stepData?.metadata?.scriptTemplateScoring || []}
              copyToClipboard={copyToClipboard}
              copiedId={copiedId}
            />
            <JsonPanel title="Step Metadata" value={stepData?.metadata} copyId="step3-metadata" copyToClipboard={copyToClipboard} copiedId={copiedId} />
          </div>
          <div className="space-y-4">
            <SectionTitle title="Video Scripts" subtitle="One card per generated script segment" />
            <div className="grid gap-4">
              {(stepData?.scripts || []).length ? stepData.scripts.map((script, index) => (
                <ScriptCard key={index} script={script} index={index} copyToClipboard={copyToClipboard} copiedId={copiedId} />
              )) : <EmptyState label="No scripts generated yet" />}
            </div>
          </div>
        </div>
      );
    case 'step4':
      return (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <MediaCard media={stepData?.video} title="Generated Video" allowWidePreview />
          <InfoList
            title="Video Details"
            items={[
              ['Title', stepData?.video?.title],
              ['Format', stepData?.video?.format],
              ['Size', stepData?.video?.sizeLabel],
              ['Provider', stepData?.video?.provider],
              ['Duration', formatSeconds(stepData?.duration)],
              ['Status', stepData?.completed ? 'Completed' : 'Pending'],
            ]}
          />
        </div>
      );
    case 'step5':
      return (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <MediaCard media={stepData?.audio} title="Voice Preview" />
            <InfoList
              title="Voice Details"
              items={[
                ['Voice Gender', stepData?.audio?.voiceGender],
                ['Voice Pace', stepData?.audio?.voicePace],
                ['Language', stepData?.audio?.language],
                ['Word Count', stepData?.audio?.wordCount ? String(stepData.audio.wordCount) : ''],
                ['Text Length', stepData?.audio?.textLength ? `${stepData.audio.textLength} chars` : ''],
                ['Format', stepData?.audio?.format],
                ['Size', stepData?.audio?.sizeLabel],
              ]}
            />
          </div>
          <PromptPanel title="Voiceover Text" value={stepData?.voiceoverText || combineScripts(flowState?.step3?.scripts)} copyId="step5-text" copyToClipboard={copyToClipboard} copiedId={copiedId} minHeight="min-h-[320px]" />
        </div>
      );
    case 'step6':
      return (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-3">
            <InfoList
              title="Final Package"
              items={[
                ['Flow ID', stepData?.finalPackage?.flowId],
                ['Type', stepData?.finalPackage?.type],
                ['Timestamp', stepData?.finalPackage?.timestamp],
                ['Duration', formatSeconds(stepData?.duration)],
              ]}
            />
            <MediaCard media={normalizeFinalMedia(stepData?.finalPackage?.images?.wearing)} title="Final Wearing" showDriveStatus />
            <MediaCard media={normalizeFinalMedia(stepData?.finalPackage?.images?.holding)} title="Final Holding" showDriveStatus />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <MediaCard media={normalizeFinalMedia(stepData?.finalPackage?.video, 'video')} title="Final Video" allowWidePreview />
            <MediaCard media={normalizeFinalMedia(stepData?.finalPackage?.audio, 'audio')} title="Final Voice" />
          </div>
          <JsonPanel title="Final Analysis Package" value={stepData?.finalPackage?.analysis} copyId="step6-analysis" copyToClipboard={copyToClipboard} copiedId={copiedId} />
        </div>
      );
    default:
      return <EmptyState label="Select a step to inspect the session preview" />;
  }
}

function normalizeFinalMedia(source, fallbackKind) {
  if (!source?.path) return null;
  const pathValue = source.path;
  const ext = pathValue.split('.').pop()?.toLowerCase() || null;
  return {
    path: pathValue,
    previewUrl: pathValue.includes('/temp/') ? pathValue : pathValue.includes('temp\\') || pathValue.includes('temp/') ? `/temp/${pathValue.split(/temp[\\/]/).pop().replace(/\\/g, '/')}` : null,
    title: pathValue.split(/[/\\]/).pop(),
    format: ext,
    driveUrl: source.driveUrl || null,
    uploadedToDrive: Boolean(source.driveUrl),
    kind: fallbackKind || (['mp4', 'mov', 'webm'].includes(ext) ? 'video' : ['mp3', 'wav', 'm4a'].includes(ext) ? 'audio' : 'image'),
  };
}

function MediaCard({ media, title, showDriveStatus = false, allowWidePreview = false }) {
  const previewUrl = media?.previewUrl || media?.driveUrl || null;
  const kind = media?.kind || inferMediaKind(media?.format);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            {media?.format ? <span className="rounded-full bg-slate-800 px-2 py-0.5 uppercase">{media.format}</span> : null}
            {media?.sizeLabel ? <span>{media.sizeLabel}</span> : null}
            {media?.title ? <span className="truncate">{media.title}</span> : null}
          </div>
        </div>
        {showDriveStatus ? <DriveStatusBadge media={media} /> : null}
      </div>

      <div className={`p-4 ${allowWidePreview ? 'min-h-[340px]' : 'min-h-[260px]'}`}>
        {previewUrl ? (
          kind === 'video' ? (
            <video controls src={previewUrl} className="h-full max-h-[340px] w-full rounded-xl bg-black object-contain" />
          ) : kind === 'audio' ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <audio controls src={previewUrl} className="w-full" />
            </div>
          ) : (
            <img src={previewUrl} alt={title} className="h-full max-h-[340px] w-full rounded-xl bg-slate-900 object-contain" />
          )
        ) : (
          <EmptyState label="No preview URL available" compact />
        )}
      </div>

      <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
        <div className="grid gap-2 md:grid-cols-2">
          <span className="truncate">Path: {media?.path || 'N/A'}</span>
          {media?.driveUrl ? (
            <a href={media.driveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-start gap-1 text-cyan-300 hover:text-cyan-200">
              Open Drive <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PromptPanel({ title, value, copyId, copyToClipboard, copiedId, minHeight = 'min-h-[260px]' }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="text-sm font-semibold text-white">{title}</div>
        <CopyButton text={value} copyId={copyId} copyToClipboard={copyToClipboard} copiedId={copiedId} />
      </div>
      <div className={`overflow-auto p-4 ${minHeight}`}>
        {value ? (
          <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{value}</pre>
        ) : (
          <EmptyState label="No content available" compact />
        )}
      </div>
    </div>
  );
}

function JsonPanel({ title, value, copyId, copyToClipboard, copiedId }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="text-sm font-semibold text-white">{title}</div>
        <CopyButton text={value ? JSON.stringify(value, null, 2) : ''} copyId={copyId} copyToClipboard={copyToClipboard} copiedId={copiedId} />
      </div>
      <div className="max-h-[360px] overflow-auto p-4">
        {value ? (
          <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">{JSON.stringify(value, null, 2)}</pre>
        ) : (
          <EmptyState label="No data available" compact />
        )}
      </div>
    </div>
  );
}

function TemplateScoringPanel({ items = [], copyToClipboard, copiedId }) {
  const scoringItems = Array.isArray(items) ? items : [];
  const maxScore = scoringItems.reduce((max, item) => Math.max(max, Number(item?.score || 0)), 0) || 1;
  const jsonValue = scoringItems.length ? scoringItems : [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="text-sm font-semibold text-white">Template Scoring</div>
        <CopyButton text={JSON.stringify(jsonValue, null, 2)} copyId="step3-template-scoring" copyToClipboard={copyToClipboard} copiedId={copiedId} />
      </div>
      <div className="space-y-3 p-4">
        {scoringItems.length ? scoringItems.map((item) => {
          const score = Number(item?.score || 0);
          const width = Math.min(100, Math.round((score / maxScore) * 100));
          return (
            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold text-slate-100">{item.name || item.id}</span>
                <span>Score: {score}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-400" style={{ width: `${width}%` }} />
              </div>
              {item.matches ? (
                <div className="mt-2 text-[10px] text-slate-400">
                  {item.matches.keywordHits ? `keywords: ${item.matches.keywordHits}` : null}
                  {item.matches.tagHits ? ` • tags: ${item.matches.tagHits}` : null}
                  {Array.isArray(item.matches.boosts) && item.matches.boosts.length ? ` • boosts: ${item.matches.boosts.map((b) => b.id).join(', ')}` : null}
                </div>
              ) : null}
            </div>
          );
        }) : (
          <EmptyState label="No scoring data available" compact />
        )}
      </div>
    </div>
  );
}

function ScriptCard({ script, index, copyToClipboard, copiedId }) {
  const scriptText = typeof script === 'string' ? script : script?.text || script?.script || JSON.stringify(script, null, 2);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-white">Segment {index + 1}</div>
          <div className="text-xs text-slate-500">{typeof script === 'object' && script?.segment ? script.segment : 'Generated script'}</div>
        </div>
        <CopyButton text={scriptText} copyId={`script-${index}`} copyToClipboard={copyToClipboard} copiedId={copiedId} />
      </div>
      <div className="p-4 text-sm leading-6 text-slate-200">
        <pre className="whitespace-pre-wrap break-words">{scriptText}</pre>
      </div>
    </div>
  );
}

function InfoList({ title, items }) {
  const filteredItems = items.filter(([, value]) => value !== null && value !== undefined && value !== '');
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 text-sm font-semibold text-white">{title}</div>
      {filteredItems.length ? (
        <div className="space-y-2 text-sm">
          {filteredItems.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3 border-b border-slate-800/70 pb-2 last:border-b-0 last:pb-0">
              <span className="text-slate-500">{label}</span>
              <span className="max-w-[65%] break-words text-right text-slate-200">{String(value)}</span>
            </div>
          ))}
        </div>
      ) : <EmptyState label="No details available" compact />}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-3 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <div className="text-base font-semibold text-white">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
    </div>
  );
}

function DriveStatusBadge({ media }) {
  if (!media) return null;
  return media.uploadedToDrive ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Uploaded to Drive
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-400">
      <Circle className="h-3.5 w-3.5" />
      Not on Drive
    </span>
  );
}

function CopyButton({ text, copyId, copyToClipboard, copiedId }) {
  return (
    <button
      onClick={() => copyToClipboard(text, copyId)}
      disabled={!text}
      className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Copy className="h-3.5 w-3.5" />
      {copiedId === copyId ? 'Copied' : 'Copy'}
    </button>
  );
}

function EmptyState({ label, compact = false }) {
  return (
    <div className={`flex items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/60 text-slate-500 ${compact ? 'min-h-[120px]' : 'min-h-[220px]'}`}>
      {label}
    </div>
  );
}

function GenericSessionFallback({ sessionData, copyToClipboard, copiedId }) {
  return (
    <div className="space-y-4">
      <InfoList
        title="Session Summary"
        items={[
          ['Status', sessionData?.status],
          ['Flow Type', sessionData?.flowType],
          ['Created At', sessionData?.createdAt ? new Date(sessionData.createdAt).toLocaleString() : ''],
          ['Logs', sessionData?.logs?.length ? String(sessionData.logs.length) : '0'],
        ]}
      />
      <JsonPanel title="Session Data" value={sessionData} copyId="generic-session" copyToClipboard={copyToClipboard} copiedId={copiedId} />
    </div>
  );
}

function inferMediaKind(format) {
  const value = String(format || '').toLowerCase();
  if (['mp4', 'mov', 'webm'].includes(value)) return 'video';
  if (['mp3', 'wav', 'm4a'].includes(value)) return 'audio';
  return 'image';
}

function formatSeconds(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  return Number.isFinite(num) ? `${num.toFixed(1)}s` : String(value);
}

function formatDuration(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'Pending';
  if (num > 1000) {
    return `${(num / 1000).toFixed(1)}s`;
  }
  return `${num.toFixed(1)}s`;
}

function combineScripts(scripts = []) {
  return scripts
    .map((script) => (typeof script === 'string' ? script : script?.text || script?.script || ''))
    .filter(Boolean)
    .join('\n\n');
}

export default SessionLogModal;
