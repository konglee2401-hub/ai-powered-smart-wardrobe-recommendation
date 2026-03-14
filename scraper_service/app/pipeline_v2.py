import asyncio
import json
import os
import random
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

from .voiceover_pipeline import (
    extract_audio,
    transcribe_audio,
    translate_text,
    translate_segments,
    generate_voice,
    create_srt,
    create_ass_karaoke,
    burn_ass_to_video,
    mux_voice_to_video,
)

try:
    import numpy as np  # type: ignore
except Exception:
    np = None  # type: ignore

try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except Exception:
    SentenceTransformer = None  # type: ignore

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer  # type: ignore
except Exception:
    SentimentIntensityAnalyzer = None  # type: ignore


def _env(name: str, default: str = "") -> str:
    return str(os.getenv(name, default) or "").strip()


def _run(cmd: List[str]):
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


def _video_duration(video_path: str) -> float:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def _video_size(video_path: str) -> Tuple[int, int]:
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


def _keyword_score(text: str) -> int:
    t = text.lower()
    keywords = [
        "không tin", "bất ngờ", "sự thật", "bí mật", "99%", "không ai biết", "wow", "amazing",
        "unbelievable", "secret", "hack", "shocking", "reveal",
        "不会", "震惊", "真相", "秘密", "不敢相信", "竟然", "太离谱", "太离谱了",
    ]
    score = 0
    for k in keywords:
        if k in t:
            score += 3
    score += text.count("!") * 2
    if "?" in text:
        score += 2
    return score


HOOK_TEMPLATES_VI = [
    "Ban se khong tin dieu nay",
    "99% moi nguoi dang lam sai dieu nay",
    "Khong ai noi cho ban bi mat nay",
    "Day la dieu khien toi bat ngo nhat hom nay",
    "Chi can 10 giay de hieu dieu nay",
    "Ban dang bo lo dieu cuc ky quan trong",
    "Dung lam dieu nay neu chua xem video nay",
    "Dieu nay thay doi hoan toan suy nghi cua toi",
    "Toi uoc minh biet dieu nay som hon",
    "Cai nay dang le phai bi cam",
    "Ban se bat ngo khi biet",
    "Chuyen nay khong ai ngo toi",
    "Toi khong tin dieu nay lai dung",
    "Dung bo qua doan nay",
    "Xem den cuoi de biet su that",
    "Dung cuon qua nhanh",
    "Chi 3 giay de hieu",
    "Bat ngo chua tung co",
    "Toi vua phat hien ra",
    "Ban dang lam sai moi ngay",
    "Dung bo lo cach nay",
    "Toi vua thu va soc nang",
    "Ly do that su la day",
    "Neu ban muon biet su that",
    "Chuyen nay khien toi shock",
    "Khong ai noi ban dieu nay ca",
    "Ban se thay doi quan diem",
    "Chuyen nay dang viral",
    "Ban se muon thu ngay",
    "Vua lam thu hom qua",
    "Co the ban dang lam sai",
    "Day la bi mat",
    "Khong the tin noi",
    "Ban co biet khong",
    "Day la ly do that",
    "Bi kip nay",
    "Don gian nhung hieu qua",
    "Nhin ky doan nay",
    "Ket qua bat ngo",
    "Day la su that",
    "Khong ai ngo toi",
    "Doi doi nho meo nay",
    "Chuyen nay dang lam mua lam gio",
    "Neu ban dang gap van de nay",
    "Ban da tung gap chua",
    "Khong phai ai cung biet",
    "Chieu nay cuc hay",
    "Toi vua thu va thanh cong",
    "Khong ai can ban dieu nay",
    "Day la truc tiep tu trai nghiem",
    "Sai lam pho bien nhat",
    "Ban dung sai cach",
    "Ban can biet dieu nay",
    "Meo nho nay cuu ban",
    "Chi can 30 giay",
    "Dung bo qua",
    "Chot lai mot dieu",
    "No hoat dong that",
    "Ket qua ngoai du kien",
    "Ban se khoc vi bat ngo",
    "Dung lam dieu nay nua",
    "Mot bi mat nho",
    "Day la ly do",
    "Chuyen nay rat it nguoi biet",
    "Khong ai noi ve dieu nay",
    "Ban se muon chia se",
    "Meo nay dang len xu huong",
    "Toi vua tim ra cach",
    "Neu ban muon nhanh hon",
    "Chi can nho dieu nay",
    "Day la cau tra loi",
    "Toi vua phat hien",
    "Ban se thay doi ngay",
    "Ban se thich dieu nay",
    "Chuyen nay khong tuong tuong noi",
    "Ban se hoan toan bat ngo",
    "Khong tin thi thu",
    "Lam thu mot lan",
    "Day la cach don gian",
    "Day la ly do ban that bai",
    "Dung lam the nay nua",
    "Ban dang bi lua",
    "Dung bo qua meo nay",
    "Day la buc tranh that",
    "Su that phu phang",
    "Day la dieu ma ai cung bo qua",
    "Ban dang bo qua chi tiet nho",
    "Ban se cam on toi",
    "Toi muon chia se bi mat",
    "Chi 5 giay",
    "Co mot dieu rat la",
    "Toi da sai lam ca nam",
    "Day la meo cuc chat",
    "Ban se muon xem lai",
    "Cho toi 10 giay",
    "Toi vua thu trong 7 ngay",
    "Day la ket qua",
    "Chuyen nay dang hot",
    "Day la tip it ai biet",
    "Neu ban dang tim giai phap",
    "Ban se muon ap dung",
    "Dung cuoi, nhung no dung that",
    "Ban se doi doi",
    "Chuyen nay giai thich tat ca",
    "Day la cach nhanh nhat",
    "Ban se khong the bo qua",
    "Day la cach toi lam",
    "Toi da thu va hoat dong",
    "Day la ly do that su",
    "Chi can nho nhat mot dieu",
    "Ban dang lam dung khong",
    "Day la loi sai pho bien",
    "Dung che",
    "Toi thach ban thu",
]


_HOOK_MODEL = None
_HOOK_SENTIMENT = None


def _get_hook_model():
    global _HOOK_MODEL
    if _HOOK_MODEL is None and SentenceTransformer is not None:
        _HOOK_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    return _HOOK_MODEL


def _get_sentiment():
    global _HOOK_SENTIMENT
    if _HOOK_SENTIMENT is None and SentimentIntensityAnalyzer is not None:
        _HOOK_SENTIMENT = SentimentIntensityAnalyzer()
    return _HOOK_SENTIMENT


def _extract_topic(text: str) -> str:
    stop = {
        "la", "va", "cua", "cho", "mot", "nhung", "ban", "toi", "nay", "do", "nay",
        "co", "khong", "de", "khi", "neu", "da", "se", "nen", "den", "dang", "nhieu",
        "voi", "trong", "the", "nhat", "rat", "nen", "them", "cai", "day",
    }
    words = [w.strip(".,!?;:()[]{}\"'") for w in text.lower().split()]
    words = [w for w in words if w and w not in stop and len(w) > 2]
    if not words:
        return ""
    freq: Dict[str, int] = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    top = sorted(freq.items(), key=lambda x: (-x[1], x[0]))[:3]
    phrase = " ".join([w for w, _ in top]).strip()
    return f"ve {phrase}" if phrase else ""


def generate_hook_text(base_text: str) -> str:
    topic = _extract_topic(base_text)
    candidates = []
    for _ in range(12):
        template = random.choice(HOOK_TEMPLATES_VI)
        hook = f"{template} {topic}".strip() if topic else template
        candidates.append(hook)

    model = _get_hook_model()
    if model is not None and np is not None:
        try:
            emb = model.encode(candidates)
            base = model.encode(["viral tiktok hook"])[0]
            base_norm = np.linalg.norm(base)
            scores = []
            for e in emb:
                score = float(np.dot(e, base) / (np.linalg.norm(e) * base_norm))
                scores.append(score)
            best_idx = int(np.argmax(scores))
            return candidates[best_idx]
        except Exception:
            pass

    return candidates[0] if candidates else ""


def select_viral_window(segments: List[Dict[str, Any]], min_len: float = 12.0, max_len: float = 25.0) -> Tuple[float, float]:
    if not segments:
        return 0.0, 0.0

    best = (segments[0]["start"], segments[min(1, len(segments) - 1)]["end"])
    best_score = -1

    n = len(segments)
    for i in range(n):
        start = segments[i]["start"]
        total_score = 0
        for j in range(i, n):
            end = segments[j]["end"]
            duration = end - start
            total_score += _keyword_score(segments[j].get("text", ""))
            if duration < min_len:
                continue
            if duration > max_len:
                break
            length_bonus = 4 if 15 <= duration <= 22 else 2
            score = total_score + length_bonus
            if score > best_score:
                best_score = score
                best = (start, end)
        if (segments[i]["end"] - start) > max_len:
            continue

    if best_score < 0:
        start = segments[0]["start"]
        end = min(segments[-1]["end"], start + max_len)
        return start, end

    return best


def cut_clip(video_path: str, out_path: str, start: float, end: float):
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{start:.2f}",
        "-to",
        f"{end:.2f}",
        "-i",
        video_path,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        out_path,
    ]
    _run(cmd)


def cut_segment(video_path: str, out_path: str, start: float, duration: float):
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{start:.2f}",
        "-t",
        f"{duration:.2f}",
        "-i",
        video_path,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        out_path,
    ]
    _run(cmd)


def _escape_drawtext(text: str) -> str:
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'").replace("\n", "\\n")


def _wrap_drawtext(text: str, max_chars: int = 24, max_lines: int = 2) -> str:
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
    return "\n".join(lines)


def add_hook(hook_path: str, clip_path: str, out_path: str, caption_text: str = "", position: str = "top", font_size: int = 96):
    filter_chain = "[0:v]scale=1080:1920,setsar=1[hv];[1:v]scale=1080:1920,setsar=1[cv];[hv][cv]concat=n=2:v=1:a=0"
    if caption_text:
        y_pos = "h*0.14" if position == "top" else "h*0.38"
        max_chars = 18 if font_size >= 140 else 22 if font_size >= 110 else 26
        wrapped = _wrap_drawtext(caption_text, max_chars=max_chars, max_lines=2)
        escaped = _escape_drawtext(wrapped)
        filter_chain = (
            f"[0:v]scale=1080:1920,setsar=1,drawtext=text='{escaped}':font=Arial:fontsize={font_size}:"
            "fontcolor=white:bordercolor=#00B3FF:borderw=6:box=1:boxcolor=black@0.7:"
            f"x=(w-text_w)/2:y={y_pos}:enable='between(t,0,3)'[hook];"
            "[1:v]scale=1080:1920,setsar=1[cv];"
            "[hook][cv]concat=n=2:v=1:a=0"
        )
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        hook_path,
        "-i",
        clip_path,
        "-filter_complex",
        filter_chain,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        out_path,
    ]
    _run(cmd)


def create_hook_clip(text: str, out_path: str, duration: int = 3, font_size: int = 140, position: str = "top"):
    y_pos = "h*0.14" if position == "top" else "h*0.38"
    max_chars = 18 if font_size >= 140 else 22 if font_size >= 110 else 26
    wrapped = _wrap_drawtext(text, max_chars=max_chars, max_lines=2)
    escaped = _escape_drawtext(wrapped)
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c=black:s=1080x1920:d={duration}",
        "-vf",
        f"drawtext=text='{escaped}':font=Arial:fontsize={font_size}:fontcolor=white:"
        f"bordercolor=#00B3FF:borderw=6:box=1:boxcolor=black@0.7:x=(w-text_w)/2:y={y_pos}",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        out_path,
    ]
    _run(cmd)


def overlay_hook_caption(scene_path: str, out_path: str, caption_text: str, position: str = "top", font_size: int = 96):
    y_pos = "h*0.14" if position == "top" else "h*0.38"
    max_chars = 18 if font_size >= 140 else 22 if font_size >= 110 else 26
    wrapped = _wrap_drawtext(caption_text, max_chars=max_chars, max_lines=2)
    escaped = _escape_drawtext(wrapped)
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        scene_path,
        "-vf",
        f"drawtext=text='{escaped}':font=Arial:fontsize={font_size}:fontcolor=white:"
        f"bordercolor=#00B3FF:borderw=6:box=1:boxcolor=black@0.7:x=(w-text_w)/2:y={y_pos}",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        out_path,
    ]
    _run(cmd)


def add_broll(base_path: str, broll_path: str, out_path: str):
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        base_path,
        "-i",
        broll_path,
        "-filter_complex",
        "[1:v]scale=iw*0.35:-1[b];[0:v][b]overlay=W-w-24:H-h-120",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        out_path,
    ]
    _run(cmd)


def vertical_encode(video_path: str, out_path: str):
    vf = "scale=1080:-2:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black"
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        video_path,
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        out_path,
    ]
    _run(cmd)


def make_caption(text: str) -> Dict[str, str]:
    hooks = [
        "Bạn sẽ bất ngờ 😱",
        "Không ai nói cho bạn điều này",
        "Đây là sự thật!",
        "99% mọi người không biết",
    ]
    hashtags = ["#fyp", "#xuhuong", "#tiktoktrend", "#viral", "#review", "#fypシ"]
    caption = f"{random.choice(hooks)} {text[:90].strip()}"
    tags = " ".join(random.sample(hashtags, 3))
    return {"caption": caption, "hashtags": tags}


async def run_pipeline_v2(
    video_path: str,
    output_dir: str,
    translate_target: str = "vi",
    voice: str = "vi-VN-HoaiMyNeural",
    enable_transcript: bool = True,
    enable_voiceover: bool = True,
    enable_viral_select: bool = True,
    clip_min_seconds: float = 12.0,
    clip_max_seconds: float = 25.0,
    enable_hook: bool = True,
    enable_broll: bool = True,
    enable_vertical: bool = True,
    enable_hook_caption: bool = True,
    hook_caption_position: str = "top",
    hook_caption_font_size: int = 96,
    keep_only_final: bool = False,
) -> Dict[str, Any]:
    t0 = time.monotonic()
    timings: Dict[str, float] = {}

    def _log_step(step: str, started: float):
        elapsed = round(time.monotonic() - started, 2)
        timings[step] = elapsed
        print(f"[pipeline-v2] {step} took {elapsed:.2f}s")

    output_root = Path(output_dir)
    output_root.mkdir(parents=True, exist_ok=True)

    assets_root = Path(_env("VOICEOVER_ASSETS_ROOT", "C:\\Work\\Affiliate-AI\\smart-wardrobe\\scraper_service\\assets"))
    hook_path = assets_root / "hook.mp4"
    broll_dir = assets_root / "broll"

    clip_path = str(output_root / "clip.mp4")
    hook_clip_path = str(output_root / "hooked.mp4")
    hook_scene_path = str(output_root / "hook_scene.mp4")
    hook_tail_path = str(output_root / "hook_tail.mp4")
    broll_clip_path = str(output_root / "broll.mp4")
    vertical_path = str(output_root / "vertical.mp4")
    audio_path = str(output_root / "audio.wav")
    transcript_path = str(output_root / "transcript.txt")
    translated_path = str(output_root / "translated.txt")
    voice_path = str(output_root / "voice.mp3")
    subtitle_path = str(output_root / "subtitle.srt")
    ass_path = str(output_root / "subtitle.ass")
    output_video_path = str(output_root / "voiceover.mp4")
    captioned_video_path = str(output_root / "final.mp4")
    metadata_path = str(output_root / "metadata.json")
    timing_path = str(output_root / "timing.json")

    step = time.monotonic()
    segments_full = await asyncio.to_thread(transcribe_audio, video_path)
    _log_step("transcribe_full", step)

    hook_caption = ""
    if enable_hook and enable_hook_caption and segments_full:
        seed_text = " ".join(seg.get("text", "") for seg in segments_full[:5]).strip()
        if seed_text:
            try:
                seed_vi = await asyncio.to_thread(translate_text, seed_text, translate_target)
            except Exception:
                seed_vi = seed_text
            hook_caption = generate_hook_text(seed_vi)

    step = time.monotonic()
    duration = _video_duration(video_path)
    if enable_viral_select:
        start, end = select_viral_window(segments_full, clip_min_seconds, clip_max_seconds)
    else:
        start = 0.0
        end = min(duration or clip_max_seconds, clip_max_seconds)
    if duration > 0:
        end = min(end, duration)
    _log_step("viral_select", step)

    step = time.monotonic()
    await asyncio.to_thread(cut_clip, video_path, clip_path, start, end)
    _log_step("cut_clip", step)

    source_for_edit = clip_path
    if enable_hook:
        step = time.monotonic()
        clip_duration = max(0.0, end - start)
        hook_duration = 3.0 if clip_duration >= 3.0 else max(0.0, clip_duration)
        if hook_duration > 0:
            await asyncio.to_thread(cut_segment, clip_path, hook_scene_path, 0.0, hook_duration)
            tail_duration = max(0.0, clip_duration - hook_duration)
            if tail_duration > 0.05:
                await asyncio.to_thread(cut_segment, clip_path, hook_tail_path, hook_duration, tail_duration)
                await asyncio.to_thread(
                    add_hook,
                    hook_scene_path,
                    hook_tail_path,
                    hook_clip_path,
                    hook_caption if enable_hook_caption else "",
                    hook_caption_position,
                    hook_caption_font_size,
                )
                source_for_edit = hook_clip_path
            else:
                if enable_hook_caption and hook_caption:
                    await asyncio.to_thread(
                        overlay_hook_caption,
                        hook_scene_path,
                        hook_clip_path,
                        hook_caption,
                        hook_caption_position,
                        hook_caption_font_size,
                    )
                    source_for_edit = hook_clip_path
                else:
                    source_for_edit = hook_scene_path
            _log_step("hook", step)

    if enable_broll and broll_dir.exists():
        brolls = [p for p in broll_dir.iterdir() if p.suffix.lower() in {".mp4", ".mov", ".mkv"}]
        if brolls:
            step = time.monotonic()
            broll_pick = random.choice(brolls)
            await asyncio.to_thread(add_broll, source_for_edit, str(broll_pick), broll_clip_path)
            source_for_edit = broll_clip_path
            _log_step("broll", step)

    if enable_vertical:
        step = time.monotonic()
        await asyncio.to_thread(vertical_encode, source_for_edit, vertical_path)
        _log_step("vertical_encode", step)
        source_for_edit = vertical_path

    step = time.monotonic()
    await asyncio.to_thread(extract_audio, source_for_edit, audio_path)
    _log_step("extract_audio", step)

    step = time.monotonic()
    segments = await asyncio.to_thread(transcribe_audio, audio_path)
    _log_step("transcribe_clip", step)

    text = " ".join(seg.get("text", "") for seg in segments).strip()
    translated_segments = segments
    translated_text = text
    if enable_voiceover:
        step = time.monotonic()
        translated_text = await asyncio.to_thread(translate_text, text, translate_target)
        translated_segments = await asyncio.to_thread(translate_segments, segments, translate_target)
        _log_step("translate", step)

    if enable_transcript:
        with open(transcript_path, "w", encoding="utf-8") as f:
            f.write(text)
        with open(translated_path, "w", encoding="utf-8") as f:
            f.write(translated_text)

        step = time.monotonic()
        await asyncio.to_thread(create_srt, translated_segments, subtitle_path)
        width, height = _video_size(source_for_edit)
        await asyncio.to_thread(create_ass_karaoke, translated_segments, ass_path, width, height)
        _log_step("subtitle", step)

    if enable_voiceover:
        step = time.monotonic()
        await generate_voice(translated_text, voice_path, voice)
        _log_step("voice", step)

    if enable_voiceover:
        step = time.monotonic()
        await asyncio.to_thread(mux_voice_to_video, source_for_edit, voice_path, output_video_path)
        _log_step("mux_voice", step)
        if enable_transcript:
            step = time.monotonic()
            await asyncio.to_thread(burn_ass_to_video, output_video_path, ass_path, captioned_video_path)
            _log_step("burn_caption", step)

    meta = make_caption(translated_text)
    final_output = captioned_video_path if enable_transcript else output_video_path
    meta.update({
        "clipStart": start,
        "clipEnd": end,
        "outputVideo": final_output,
    })
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    timings["total"] = round(time.monotonic() - t0, 2)
    with open(timing_path, "w", encoding="utf-8") as f:
        json.dump(timings, f, ensure_ascii=False, indent=2)

    if keep_only_final:
        final_name = Path(final_output).name
        video_exts = {".mp4", ".mov", ".mkv", ".webm"}
        for item in output_root.iterdir():
            if not item.is_file():
                continue
            if item.name == final_name:
                continue
            if item.suffix.lower() in video_exts:
                try:
                    item.unlink()
                except Exception:
                    pass

    return {
        "clipPath": "" if keep_only_final else clip_path,
        "verticalPath": "" if keep_only_final else (vertical_path if enable_vertical else ""),
        "audioPath": "" if keep_only_final else audio_path,
        "transcriptPath": "" if keep_only_final else (transcript_path if enable_transcript else ""),
        "translatedPath": "" if keep_only_final else (translated_path if enable_transcript else ""),
        "voicePath": "" if keep_only_final else (voice_path if enable_voiceover else ""),
        "subtitlePath": "" if keep_only_final else (subtitle_path if enable_transcript else ""),
        "assPath": "" if keep_only_final else (ass_path if enable_transcript else ""),
        "outputVideoPath": final_output,
        "captionedVideoPath": final_output,
        "metadataPath": "" if keep_only_final else metadata_path,
        "timingPath": "" if keep_only_final else timing_path,
        "timing": timings,
    }
