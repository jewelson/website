# Jewelson Fernandes — Listening Room

Portfolio homepage built as a mid-century listening room. Plain HTML, CSS and JavaScript: no build step and no dependencies apart from Google Fonts.

## Files

- `index.html`: the homepage
- `project.html`: case-study template (each card's "View case study" link)
- `css/room.css`: homepage styles; shared sizes and spacing are set once at the top
- `css/project.css`: case-study styles
- `js/room.js`: the scene: layout, gallery, frame flight, seasonal corner, music, live sky, weather and lamps
- `img/room/`: the room photo (a bare wall), window trim, picture lights, lamp, turntable and the window's summer/autumn/winter layers
- `img/room/seasonal/`: the seasonal corner images
- `img/covers/default.svg`: the default project cover
- `audio/room-loop.mp3`: placeholder music
- `functions/api/now-playing.js`: optional Spotify "now playing" endpoint (Cloudflare Pages Function)
- `scripts/spotify-token.mjs`: one-time helper to get a Spotify refresh token

## How the homepage works

- **The room** fills the first screen. It's one scene in photo pixels, scaled as a whole by `layout()` in `js/room.js`. Below 980px wide (or under 560px tall) the page stacks: room, headline, player, then the projects as a list.
- **Gallery and projects:** six frames on the wall, one per project. Edit `PROJECTS` in `js/room.js` for names, subtitles, descriptions, links and covers. Clicking a frame opens a side panel. Scrolling floats each frame down into its project card, then the card's text fades in. Phones and "reduce motion" users see the cards without the flight.
- **Covers:** every project uses `img/covers/default.svg` until you set its `cover`, for example `cover: 'img/covers/cover-1.webp'`.
- **Seasonal corner** (Creston time), set in `occasion()`:

  | Dates | Corner |
  |---|---|
  | Rest of year | plant |
  | Oct 1–31 | plant with Halloween decorations |
  | Nov 15–30 | bare tree on its stand and skirt |
  | Dec 1–15 | decorated tree |
  | Dec 16–23 | tree with gifts |
  | Dec 24 – Jan 6 | tree with gifts, lights twinkling |

- **Music:** tapping the record or the play button plays the track for the current occasion (`MUSIC` in `js/room.js`). All occasions use the placeholder loop for now. To use a licensed track, add the file under `audio/` and update `src`, `title`, `artist` and `credit` (the credit shows in the page footer).
- **Window:** the real sun position for Creston, BC, with rain, snow and night tinting. The lamps switch on as the room darkens.

## Previewing

Open `index.html` in a browser, or serve the folder (for example `python3 -m http.server`). URL parameters preview other days, times and weather:

- `?date=2026-12-24`: any date (seasonal corner, music and window season)
- `?hour=21.5`: a fixed hour, Creston time (0–24)
- `?season=midsummer`, `autumn` or `midwinter`
- `?rainRate=8` (mm/h) and `?snowRate=3` (cm/h) set how heavy the Rain and Snow previews are

## Going live (Cloudflare Pages)

1. Create a free Cloudflare account, then **Workers & Pages → Create → Pages → Connect to Git** and pick `jewelson/website`. Production branch: the one you publish from. Build command: none. Output directory: `/`.
2. Under the project's **Custom domains**, add your domain. A domain bought through Cloudflare connects on its own; one from elsewhere needs the DNS records Cloudflare shows you.
3. Every push to the production branch redeploys the site.

## Spotify (optional)

Shows what you're listening to on Spotify under the player, linked to the track. Visitors still hear the site's own music; Spotify can't play full tracks to visitors who aren't logged in.

1. At [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard), **Create app**. Tick **Web API** and add the redirect URI `http://127.0.0.1:8888/callback`.
2. Copy the app's **Client ID** and **Client secret**. Keep the secret out of the repo and out of chat.
3. On your computer, run `SPOTIFY_CLIENT_ID=… SPOTIFY_CLIENT_SECRET=… node scripts/spotify-token.mjs`, open the link it prints and approve. It prints `SPOTIFY_REFRESH_TOKEN=…`.
4. In the Cloudflare Pages project, **Settings → Variables and secrets**, add `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` and `SPOTIFY_REFRESH_TOKEN` as secrets, then redeploy.

The line stays hidden until `/api/now-playing` answers, so the site works the same without it.

## Still placeholders

Project names, covers and text; the music; the temperature ("—°"). Live weather isn't connected yet.
