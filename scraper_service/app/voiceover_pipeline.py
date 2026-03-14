import asyncio
import os
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List


try:
    from faster_whisper import WhisperModel
except Exception:
    WhisperModel = None  # type: ignore

try:
    from deep_translator import GoogleTranslator
except Exception:
    GoogleTranslator = None  # type: ignore

try:
    import edge_tts
except Exception:
    edge_tts = None  # type: ignore


_MODEL = None


def _env(name: str, default: str = "") -> str:
    return str(os.getenv(name, default) or "").strip()


def _get_model():
    global _MODEL
    if _MODEL is None:
        if WhisperModel is None:
            raise RuntimeError("faster-whisper is not installed")
        model_name = _env("WHISPER_MODEL_NAME", "large-v3")
        model_path = _env("WHISPER_MODEL_PATH", "")
        device = _env("WHISPER_DEVICE", "cuda")
        compute_type = _env("WHISPER_COMPUTE", "float16")
        download_root = _env("WHISPER_MODEL_CACHE", "")
        model_source = model_path if model_path else model_name
        kwargs = {
            "device": device,
            "compute_type": compute_type,
        }
        if download_root:
            kwargs["download_root"] = download_root

        try:
            _MODEL = WhisperModel(model_source, **kwargs)
        except Exception:
            _MODEL = WhisperModel(model_source, device="cpu", compute_type="int8", **({"download_root": download_root} if download_root else {}))
    return _MODEL


def extract_audio(video_path: str, audio_path: str):
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        video_path,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        audio_path,
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


def _video_size(video_path: str) -> tuple[int, int]:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=s=x:p=0",
        video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        raw = (result.stdout or "").strip()
        if not raw:
            return 0, 0
        width, height = raw.split("x")
        return int(width), int(height)
    except Exception:
        return 0, 0


def transcribe_audio(audio_path: str) -> List[Dict[str, Any]]:
    model = _get_model()
    segments, _ = model.transcribe(audio_path, beam_size=5, word_timestamps=True)
    results = []
    for seg in segments:
        words = []
        if getattr(seg, "words", None):
            for w in seg.words:
                if not w.word:
                    continue
                words.append({
                    "word": w.word.strip(),
                    "start": float(w.start),
                    "end": float(w.end),
                })
        results.append({
            "text": seg.text.strip(),
            "start": float(seg.start),
            "end": float(seg.end),
            "words": words,
        })
    return results


def translate_text(text: str, target: str = "vi") -> str:
    if GoogleTranslator is None:
        return text
    def _contains_cjk(value: str) -> bool:
        return any('\u4e00' <= ch <= '\u9fff' for ch in value)

    translator = GoogleTranslator(source="auto", target=target)
    try:
        translated = translator.translate(text)
    except Exception:
        translated = text

    if translated and _contains_cjk(translated):
        try:
            translated = GoogleTranslator(source="zh-CN", target=target).translate(text)
        except Exception:
            pass

    return translated


def translate_segments(segments: List[Dict[str, Any]], target: str = "vi") -> List[Dict[str, Any]]:
    if GoogleTranslator is None:
        return segments
    def _contains_cjk(value: str) -> bool:
        return any('\u4e00' <= ch <= '\u9fff' for ch in value)

    translator = GoogleTranslator(source="auto", target=target)
    translated: List[Dict[str, Any]] = []
    for seg in segments:
        text = seg.get("text", "").strip()
        if not text:
            translated.append({**seg, "text": text, "words": []})
            continue
        try:
            t = translator.translate(text)
        except Exception:
            t = text
        if t and _contains_cjk(t):
            try:
                t = GoogleTranslator(source="zh-CN", target=target).translate(text)
            except Exception:
                pass
        # Drop word-level timestamps to avoid rendering original-language karaoke.
        translated.append({**seg, "text": t, "words": []})
    return translated


async def generate_voice(text: str, output_path: str, voice: str):
    if edge_tts is None:
        raise RuntimeError("edge-tts is not installed")
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)


def create_srt(segments: List[Dict[str, Any]], path: str):
    def wrap_text(text: str, max_chars: int = 28, max_lines: int = 2) -> str:
        words = text.split()
        if not words:
            return text
        lines = []
        current = ""
        for word in words:
            if not current:
                current = word
                continue
            if len(current) + 1 + len(word) <= max_chars:
                current = f"{current} {word}"
            else:
                lines.append(current)
                current = word
            if len(lines) >= max_lines - 1:
                continue
        if current:
            lines.append(current)
        if len(lines) > max_lines:
            lines = lines[:max_lines]
        return "\n".join(lines)
    def fmt_time(seconds: float) -> str:
        millis = int(seconds * 1000)
        s, ms = divmod(millis, 1000)
        m, s = divmod(s, 60)
        h, m = divmod(m, 60)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    with open(path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(segments, start=1):
            f.write(f"{i}\n")
            f.write(f"{fmt_time(seg['start'])} --> {fmt_time(seg['end'])}\n")
            f.write(f"{wrap_text(seg['text'])}\n\n")


def create_ass_karaoke(segments: List[Dict[str, Any]], path: str, video_width: int = 1080, video_height: int = 1920):
    is_vertical = video_height >= video_width if video_width and video_height else True
    play_res_x = video_width if video_width else 1080
    play_res_y = video_height if video_height else 1920
    font_size = 96 if is_vertical else 72
    max_chars = 24 if is_vertical else 36
    margin_lr = int(play_res_x * 0.1) if is_vertical else int(play_res_x * 0.08)
    margin_v = int(play_res_y * (0.12 if is_vertical else 0.1))

    def wrap_text(text: str, max_chars: int = max_chars, max_lines: int = 2) -> str:
        words = text.split()
        if not words:
            return text
        lines = []
        current = ""
        for word in words:
            if len(word) > max_chars:
                if current:
                    lines.append(current)
                    current = ""
                chunks = [word[i:i + max_chars] for i in range(0, len(word), max_chars)]
                for chunk in chunks:
                    if len(lines) < max_lines:
                        lines.append(chunk)
                continue
            if not current:
                current = word
                continue
            if len(current) + 1 + len(word) <= max_chars:
                current = f"{current} {word}"
            else:
                lines.append(current)
                current = word
            if len(lines) >= max_lines - 1:
                continue
        if current:
            lines.append(current)
        if len(lines) > max_lines:
            lines = lines[:max_lines]
        return r"\N".join(lines)
    def to_ass_time(seconds: float) -> str:
        total = int(seconds * 100)
        cs = total % 100
        total //= 100
        s = total % 60
        total //= 60
        m = total % 60
        h = total // 60
        return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"

    # Trending style: bold white text, black outline, subtle shadow, bottom center,
    # with a semi-transparent dark box behind text.
    header = "\n".join([
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {play_res_x}",
        f"PlayResY: {play_res_y}",
        "WrapStyle: 2",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, "
        "MarginR, MarginV, Encoding",
        # Primary: white, Secondary: yellow (karaoke highlight), Outline: black, Back: semi-transparent black
        # Size/position tuned to sit on top of original subtitles near the bottom.
        f"Style: Default,Arial,{font_size},&H00FFFFFF,&H0000D1FF,&H00000000,&HAA000000,1,0,0,0,100,100,0,0,3,5,2,2,{margin_lr},{margin_lr},{margin_v},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ])

    lines = [header]
    for seg in segments:
        words = seg.get("words") or []
        if not words:
            start = to_ass_time(seg["start"])
            end = to_ass_time(seg["end"])
            text = seg["text"].replace("\n", " ").strip()
            if not text:
                continue
            lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{wrap_text(text)}")
            continue

        start = to_ass_time(words[0]["start"])
        end = to_ass_time(words[-1]["end"])
        parts = []
        for w in words:
            duration_cs = max(1, int(round((w["end"] - w["start"]) * 100)))
            parts.append(rf"{{\k{duration_cs}}}{w['word']}")
        text = " ".join(parts)
        lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    # Write with BOM so ffmpeg/libass can detect UTF-8 reliably on Windows.
    with open(path, "w", encoding="utf-8-sig") as f:
        f.write("\n".join(lines))


def burn_ass_to_video(video_path: str, ass_path: str, output_path: str):
    ass_abs = Path(ass_path).resolve()
    video_abs = Path(video_path).resolve()
    output_abs = Path(output_path).resolve()
    ass_dir = ass_abs.parent
    ass_name = ass_abs.name
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_abs),
        "-vf",
        f"ass={ass_name}",
        "-c:a",
        "copy",
        str(output_abs),
    ]
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        cwd=str(ass_dir),
    )
    if result.returncode != 0:
        try:
            err_path = ass_dir / "ass_error.log"
            with open(err_path, "w", encoding="utf-8") as f:
                f.write(result.stderr or "")
        except Exception:
            pass
        raise RuntimeError(result.stderr.strip() if result.stderr else "ffmpeg ass filter failed")


def mux_voice_to_video(video_path: str, voice_path: str, output_path: str):
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        video_path,
        "-i",
        voice_path,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "copy",
        output_path,
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


async def run_voiceover_pipeline(
    video_path: str,
    output_dir: str,
    translate_target: str = "vi",
    voice: str = "vi-VN-HoaiMyNeural",
    overlay_video: bool = True,
    enable_transcript: bool = True,
    enable_voiceover: bool = True,
) -> Dict[str, Any]:
    t0 = time.monotonic()
    timings: Dict[str, float] = {}
    def _log_step(step: str, started: float):
        elapsed = time.monotonic() - started
        timings[step] = round(elapsed, 2)
        print(f"[voiceover] {step} took {elapsed:.2f}s")

    output_root = Path(output_dir)
    output_root.mkdir(parents=True, exist_ok=True)

    audio_path = str(output_root / "audio.wav")
    transcript_path = str(output_root / "transcript.txt")
    translated_path = str(output_root / "translated.txt")
    voice_path = str(output_root / "voice.mp3")
    subtitle_path = str(output_root / "subtitle.srt")
    ass_path = str(output_root / "subtitle.ass")
    output_video_path = str(output_root / "voiceover.mp4")
    captioned_video_path = str(output_root / "voiceover_captioned.mp4")

    step = time.monotonic()
    await asyncio.to_thread(extract_audio, video_path, audio_path)
    _log_step("extract_audio", step)

    step = time.monotonic()
    segments = await asyncio.to_thread(transcribe_audio, audio_path)
    _log_step("transcribe", step)

    step = time.monotonic()
    text = " ".join([seg["text"] for seg in segments]).strip()

    if enable_transcript:
        with open(transcript_path, "w", encoding="utf-8") as f:
            f.write(text)

    translated = ""
    translated_segments = segments
    if enable_voiceover:
        step = time.monotonic()
        translated = await asyncio.to_thread(translate_text, text, translate_target)
        translated_segments = await asyncio.to_thread(translate_segments, segments, translate_target)
        _log_step("translate", step)
        if enable_transcript:
            with open(translated_path, "w", encoding="utf-8") as f:
                f.write(translated)

    if enable_transcript:
        step = time.monotonic()
        await asyncio.to_thread(create_srt, translated_segments, subtitle_path)
        width, height = _video_size(video_path)
        await asyncio.to_thread(create_ass_karaoke, translated_segments, ass_path, width, height)
        _log_step("subtitle", step)

    if enable_voiceover:
        step = time.monotonic()
        await generate_voice(translated, voice_path, voice)
        _log_step("voice", step)

    if enable_voiceover and overlay_video:
        step = time.monotonic()
        await asyncio.to_thread(mux_voice_to_video, video_path, voice_path, output_video_path)
        _log_step("mux_voice", step)
        if enable_transcript:
            step = time.monotonic()
            await asyncio.to_thread(burn_ass_to_video, output_video_path, ass_path, captioned_video_path)
            _log_step("burn_caption", step)

    total = round(time.monotonic() - t0, 2)
    timings["total"] = total
    print(f"[voiceover] total took {total:.2f}s")

    timing_path = str(output_root / "timing.json")
    try:
        import json
        with open(timing_path, "w", encoding="utf-8") as f:
            json.dump(timings, f, ensure_ascii=False, indent=2)
    except Exception:
        timing_path = ""

    return {
        "audioPath": audio_path,
        "transcriptPath": transcript_path if enable_transcript else "",
        "translatedPath": translated_path if enable_transcript else "",
        "voicePath": voice_path if enable_voiceover else "",
        "subtitlePath": subtitle_path if enable_transcript else "",
        "assPath": ass_path if enable_transcript else "",
        "outputVideoPath": output_video_path if enable_voiceover and overlay_video else "",
        "captionedVideoPath": captioned_video_path if enable_voiceover and overlay_video and enable_transcript else "",
        "timingPath": timing_path,
        "timing": timings,
    }
