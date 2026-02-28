# Multi-platform account readiness for video production auto-posting

This document captures the baseline configuration required so each account in Video Production can be used for automated posting.

## Supported platforms
- YouTube
- Facebook
- TikTok

## Required per-account configuration in UI
Each account should include:
- Platform
- Account handle / username
- Identity target (channel ID, page ID, or advertiser/business ID)
- API key (where required)
- Access token
- Refresh token (recommended)
- OAuth client ID + client secret (recommended)

## YouTube posting readiness
- API: YouTube Data API v3 + resumable uploads endpoint.
- Required scopes (OAuth):
  - `https://www.googleapis.com/auth/youtube.upload`
  - `https://www.googleapis.com/auth/youtube`
- Basic options for posting:
  - title, description, tags
  - categoryId
  - privacyStatus (`private`, `unlisted`, `public`)
  - scheduled publish (`publishAt`)
  - thumbnail upload (optional)

## Facebook posting readiness
- API: Graph API for Pages video and feed publishing.
- Required permissions:
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`
  - `publish_video`
- Basic options for posting:
  - page target via Page ID
  - message/caption
  - scheduled publish (`published=false` + `scheduled_publish_time`)
  - crosspost options when available

## TikTok posting readiness
- API: TikTok Content Posting API / Upload API.
- Required scopes:
  - `video.upload`
  - `video.publish`
  - `user.info.basic`
- Basic options for posting:
  - title/caption + hashtags
  - privacy level / audience controls
  - interaction controls (duet/stitch/comment)
  - publish directly or as draft based on platform support

## Verification workflow recommendation
1. Validate account-level keys/tokens before save.
2. Verify all accounts in bulk after setup changes.
3. Persist last verification result, timestamp, and account status in account metadata.
4. Use only accounts with `active` status in auto-post workflows.
