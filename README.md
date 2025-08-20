# Prompt This Into Existence! – Orientation Utilities (Alarm • Stopwatch • Timer • Weather)

Mobile-first, one-page web app that changes functionality based on how you hold your phone:

- Portrait (upright): Alarm Clock
- Landscape (right-side up): Stopwatch
- Portrait (upside down): Timer
- Landscape (opposite side up): Weather of the Day (Open-Meteo)

Runs entirely in the browser. No backend.

## Quick start

1. Serve the folder (any static server):

```bash
python3 -m http.server 8000
```

2. Open `http://localhost:8000` on your phone (same network) or in your mobile simulator. Rotate to switch modes.

Permissions:
- Location is used only when the Weather view becomes active
- Notifications enable a toast for timer completion
- Vibration is used for timer/alarm feedback

## Tech
- Vanilla JS, HTML, CSS
- Screen Orientation API with robust fallbacks for iOS Safari
- Open-Meteo free API for weather
- Web Audio API for the alarm tone

## Deployment
- Drop these static files on any static host (GitHub Pages, Netlify, Vercel). No build step required.

## License
MIT

