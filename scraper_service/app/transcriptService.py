"""
YouTube Transcript Service

Fetches and converts YouTube video transcripts to SRT format.
Supports Vietnamese, English, Hindi, and automatic language fallback.

Note: YouTube's API enforces strict rate limiting (429 errors).
For production use at scale, consider using a dedicated proxy service.
"""

import re
import time
from datetime import timedelta
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter


class TranscriptService:
    """Service for fetching and formatting YouTube transcripts"""
    
    # Preferred languages: Vietnamese first, then English, then Hindi, then auto-detect
    DEFAULT_LANGUAGES = ['vi', 'en', 'hi']
    RATE_LIMIT_COOLDOWN_SEC = 2 * 60 * 60  # 2 hours
    _rate_limit_cache = {}
    
    @staticmethod
    def _format_timestamp(seconds: float) -> str:
        """Convert seconds to SRT timestamp format (HH:MM:SS,MMM)"""
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        millis = int((seconds % 1) * 1000)
        return f'{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}'
    
    @staticmethod
    def _fetch_raw_transcript(video_id: str, languages: list = None, retry_count: int = 0):
        """
        Fetch raw transcript from YouTube using list_transcripts + find methods
        
        Args:
            video_id: YouTube video ID (11 characters)
            languages: List of language codes to try (e.g., ['vi', 'en', 'hi'])
            retry_count: Current retry attempt (internal)
        
        Returns:
            (transcript_snippets, error_code)
            - transcript_snippets: list of snippets or []
            - error_code: None | 'rate_limited' | 'not_found' | 'fatal'
            
        Note: YouTube enforces strict rate limiting (429 errors) on transcript API calls.
        Production use at scale requires IP rotation or proxy service.
        """
        if not languages:
            languages = TranscriptService.DEFAULT_LANGUAGES

        # Skip if recently rate-limited
        last_limited = TranscriptService._rate_limit_cache.get(video_id)
        if last_limited and (time.time() - last_limited) < TranscriptService.RATE_LIMIT_COOLDOWN_SEC:
            print(f'[TranscriptService] Skipping transcript fetch for {video_id} (rate-limit cooldown)')
            return [], 'rate_limited'
        
        try:
            print(f'[TranscriptService] Listing available transcripts for {video_id}...')
            
            # Get available transcripts
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            # Try each language in order
            for lang_code in languages:
                try:
                    print(f'[TranscriptService] Attempting {lang_code}...')
                    
                    # Find transcript for language (checks both manually created and auto-generated)
                    transcript_obj = transcript_list.find_transcript([lang_code])
                    print(f'[TranscriptService] ✅ Found {lang_code}: {transcript_obj.language}')
                    
                    # Fetch the actual transcript
                    transcript_data = transcript_obj.fetch()
                    print(f'[TranscriptService] ✅ Fetched {lang_code} - {len(transcript_data)} snippets')
                    
                    return TranscriptService._normalize_snippets(transcript_data), None
                
                except Exception as find_error:
                    error_str = str(find_error)
                    
                    # Handle rate limiting (429)
                    if '429' in error_str or 'Too Many Requests' in error_str:
                        TranscriptService._rate_limit_cache[video_id] = time.time()
                        print(f'[TranscriptService] Rate limited (429). Skipping transcript fetch for this video.')
                        return [], 'rate_limited'
                    
                    # Log other language not found errors
                    print(f'[TranscriptService] {lang_code} unavailable for {video_id}: {error_str[:120]}')
            
            print(f'[TranscriptService] No transcripts found for requested languages')
            return [], 'not_found'
        
        except Exception as e:
            error_str = str(e)
            if '429' in error_str or 'Too Many Requests' in error_str:
                TranscriptService._rate_limit_cache[video_id] = time.time()
                print(f'[TranscriptService] Rate limited (429). Skipping transcript fetch for this video.')
                return [], 'rate_limited'
            print(f'[TranscriptService] Fatal error: {error_str[:200]}')
            return [], 'fatal'
    
    @staticmethod
    def _normalize_snippets(transcript: list) -> list:
        """Normalize transcript snippets to standard format"""
        return [
            {
                'text': snippet.get('text', '').strip(),
                'start': float(snippet.get('start', 0)),
                'duration': float(snippet.get('duration', 0)),
            }
            for snippet in transcript
            if snippet.get('text', '').strip()
        ]
    
    @staticmethod
    def _convert_to_srt(transcript_snippets: list) -> str:
        """
        Convert raw transcript snippets to SRT subtitle format
        
        Format:
            1
            00:00:00,000 --> 00:00:05,000
            First text line
            
            2
            00:00:05,000 --> 00:00:10,000
            Second text line
        
        Args:
            transcript_snippets: List of {'text': str, 'start': float, 'duration': float}
        
        Returns:
            SRT formatted string
        """
        if not transcript_snippets:
            return ''
        
        srt_lines = []
        
        for idx, snippet in enumerate(transcript_snippets, start=1):
            text = snippet.get('text', '').strip()
            start = float(snippet.get('start', 0))
            duration = float(snippet.get('duration', 0))
            end = start + duration
            
            if not text:
                continue
            
            start_time = TranscriptService._format_timestamp(start)
            end_time = TranscriptService._format_timestamp(end)
            
            srt_lines.append(f'{idx}')
            srt_lines.append(f'{start_time} --> {end_time}')
            srt_lines.append(text)
            srt_lines.append('')  # Blank line between subtitles
        
        return '\n'.join(srt_lines)
    
    @staticmethod
    async def fetch_transcript(video_id: str, languages: list = None, output_format: str = 'srt') -> dict:
        """
        Main method to fetch and format transcript
        
        Args:
            video_id: YouTube video ID
            languages: List of language codes (defaults to ['vi', 'en'])
            output_format: 'srt' (default) or 'text'
        
        Returns:
            {
                'success': bool,
                'videoId': str,
                'transcript': str or None,
                'format': 'srt' | 'text',
                'language': str,
                'error': str or None,
                'snippetCount': int
            }
        """
        if not languages:
            languages = TranscriptService.DEFAULT_LANGUAGES
        
        # Validate video ID format
        if not video_id or len(video_id) != 11:
            return {
                'success': False,
                'videoId': video_id,
                'transcript': None,
                'format': output_format,
                'language': None,
                'error': f'Invalid video ID format: {video_id}',
                'snippetCount': 0
            }
        
        try:
            # Fetch raw transcript
            raw_transcript, error_code = TranscriptService._fetch_raw_transcript(video_id, languages)
            
            if not raw_transcript:
                if error_code == 'rate_limited':
                    return {
                        'success': False,
                        'videoId': video_id,
                        'transcript': None,
                        'format': output_format,
                        'language': None,
                        'error': 'rate_limited',
                        'snippetCount': 0,
                        'skipped': True
                    }
                return {
                    'success': False,
                    'videoId': video_id,
                    'transcript': None,
                    'format': output_format,
                    'language': None,
                    'error': f'No transcript available for video {video_id} (tried languages: {", ".join(languages)})',
                    'snippetCount': 0
                }
            
            # Convert to requested format
            if output_format == 'srt':
                transcript_text = TranscriptService._convert_to_srt(raw_transcript)
            else:  # text format
                transcript_text = ' '.join([snippet['text'] for snippet in raw_transcript])
            
            return {
                'success': True,
                'videoId': video_id,
                'transcript': transcript_text,
                'format': output_format,
                'language': 'mixed',  # We don't track exact language, could be vi or en
                'error': None,
                'snippetCount': len(raw_transcript)
            }
        
        except Exception as e:
            error_msg = str(e)
            print(f'[TranscriptService] Exception for {video_id}: {error_msg}')
            return {
                'success': False,
                'videoId': video_id,
                'transcript': None,
                'format': output_format,
                'language': None,
                'error': error_msg[:500],  # Truncate error message
                'snippetCount': 0
            }


async def fetch_transcript_for_video(video_id: str) -> dict:
    """
    Convenience function to fetch transcript with default settings
    
    Returns SRT format transcript for Vietnamese/English/Hindi videos
    """
    return await TranscriptService.fetch_transcript(
        video_id,
        languages=TranscriptService.DEFAULT_LANGUAGES,
        output_format='srt'
    )
