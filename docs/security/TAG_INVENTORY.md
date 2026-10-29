# Tag inventory (security framework control 20)

Every third-party script, frame, pixel or tag on the Academy, what it receives and who owns it. Review it at every phase, and quarterly after launch.

| Tag | Where | Loads | Purpose | Data it receives | Owner | Vendor assessment |
|---|---|---|---|---|---|---|
| Vimeo player (iframe from `player.vimeo.com`, plus the `@vimeo/player` SDK bundled in our JS) | Lesson pages | Only after the visitor presses play | Lesson video playback | The visitor's IP address and user agent, and the referrer origin (`strict-origin-when-cross-origin`). `dnt=1` disables Vimeo session tracking. No personal information from us | Rich | Due before Phase 7. Vimeo processes in the US, so it needs an APP 8 disclosure |
| GA4 | Not loaded | — | Analytics (decision D6, not yet approved) | Nothing yet. The `track()` wrapper already names `video_start`, `video_progress_50`, `video_complete`, `quiz_start`, `quiz_pass` and `quiz_fail` (Phase 4), each with lesson and category slugs only: never scores, answers or user IDs. When added: slugs only, never personal information or form values; not on `/join`, `/dashboard` or `/admin` | Rich | Due before it's added |
