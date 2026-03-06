# Multi-platform / Multi-account publishing requirements

## Mục tiêu
- 1 video có thể publish đồng thời lên nhiều nền tảng (`youtube`, `tiktok`, `facebook`) và nhiều account mỗi nền tảng.
- Dùng chung OAuth client app nhưng token tách riêng theo từng account/channel/page.

## Thông tin bắt buộc để upload

### YouTube
- OAuth app: `clientId`, `clientSecret`, `redirectUri`
- OAuth scope tối thiểu: `https://www.googleapis.com/auth/youtube.upload`
- Token theo account: `accessToken`, `refreshToken`
- Nhận diện account/channel: `channelId`, `channelTitle`, `accountHandle`
- Metadata upload: `title`, `description`, `privacy`, `categoryId`, `tags`, `youtubePublishType (shorts|video)`

### Facebook (Fanpage/Reels)
- OAuth app: `appId`, `appSecret`, `redirectUri`
- Scope gợi ý: `pages_manage_posts`, `pages_show_list`, `pages_read_engagement`
- Token theo account/page: `accessToken`
- Nhận diện page: `pageId`, `pageName`
- Metadata upload: `description/caption`, `published`

### TikTok
- OAuth app: `clientKey(clientId)`, `clientSecret`, `redirectUri`
- Scope gợi ý: `video.publish`, `user.info.basic`
- Token theo account: `accessToken`, `refreshToken` (nếu có)
- Nhận diện account: `open_id`/`display_name`
- Metadata upload: `title`, `privacyLevel`, `disableComment`, `disableDuet`, `disableStitch`

## Kiến trúc auth multi-account
1. Lưu OAuth app config theo từng platform (global).
2. Generate OAuth URL với `state` riêng cho từng lần cấp quyền.
3. Callback/exchange code lấy token.
4. Gắn token vào account record riêng (không ghi đè token account khác).
5. Verify token + quyền post trước khi đưa account vào danh sách active.

## Payload publish global
```json
{
  "accountTargets": [
    {
      "platform": "youtube",
      "accountIds": ["acc-youtube-1", "acc-youtube-2"],
      "uploadConfig": { "title": "My short", "youtubePublishType": "shorts" }
    },
    {
      "platform": "facebook",
      "accountIds": ["acc-fb-1"],
      "uploadConfig": { "description": "My reel" }
    }
  ]
}
```
