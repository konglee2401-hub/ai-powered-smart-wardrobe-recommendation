import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import AdvancedGenerationSettings from './AdvancedGenerationSettings';

const IMAGE_COUNTS = [1, 2, 4];
const IMAGE_GEN_ASPECT_RATIOS = ['9:16', '16:9'];

export default function GenerationOptions({
  imageCount = 2,
  onImageCountChange,
  aspectRatio = '9:16',
  onAspectRatioChange,
  referenceImage = null,
  onReferenceImageChange,
  steps = 30,
  onStepsChange,
  cfgScale = 7.5,
  onCfgScaleChange,
  samplingMethod = 'euler',
  onSamplingMethodChange,
  seed = null,
  onSeedChange,
  randomSeed = true,
  onRandomSeedChange,
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onReferenceImageChange?.({
        file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onReferenceImageChange?.({
        file,
        preview: URL.createObjectURL(file),
      });
    }
  };

  return (
    <div className="space-y-3">
      <section className="rounded-[1.2rem] bg-white/[0.03] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Count</p>
        <div className="grid grid-cols-3 gap-1.5">
          {IMAGE_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onImageCountChange?.(count)}
              className={`rounded-xl px-2 py-1.5 text-xs font-medium transition ${
                imageCount === count
                  ? 'bg-violet-500/20 text-violet-100'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.2rem] bg-white/[0.03] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ratio</p>
        <div className="grid grid-cols-2 gap-1.5">
          {IMAGE_GEN_ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => onAspectRatioChange?.(ratio)}
              className={`rounded-xl px-2 py-1.5 text-xs font-medium transition ${
                aspectRatio === ratio
                  ? 'bg-violet-500/20 text-violet-100'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[1.2rem] bg-white/[0.03] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reference</p>
        {referenceImage?.preview ? (
          <div className="relative overflow-hidden rounded-xl bg-slate-950/60">
            <div className="h-20">
              <img src={referenceImage.preview} alt="Reference" className="h-full w-full object-cover" />
            </div>
            <button
              type="button"
              onClick={() => onReferenceImageChange?.(null)}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1 text-white transition hover:bg-black/75"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex h-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-center transition ${
              dragOver
                ? 'border-violet-400/45 bg-violet-400/10'
                : 'border-white/10 bg-slate-950/55 hover:border-violet-400/30'
            }`}
          >
            <Upload className="mb-1.5 h-4 w-4 text-slate-500" />
            <span className="text-[11px] text-slate-400">Add reference</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </label>
        )}
      </section>

      <AdvancedGenerationSettings
        steps={steps}
        onStepsChange={onStepsChange}
        cfgScale={cfgScale}
        onCfgScaleChange={onCfgScaleChange}
        samplingMethod={samplingMethod}
        onSamplingMethodChange={onSamplingMethodChange}
        seed={seed}
        onSeedChange={onSeedChange}
        randomSeed={randomSeed}
        onRandomSeedChange={onRandomSeedChange}
      />
    </div>
  );
}
