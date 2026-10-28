# Jewelson Fernandes — Listening Room

Portfolio homepage built as a mid-century listening room. Plain HTML, CSS and JavaScript: no build step and no dependencies apart from Google Fonts.

## Files

- `index.html`: the homepage, one interactive page
- `project.html`: case-study template (the "View case study" link)
- `css/room.css`: homepage styles; shared sizes and spacing are set once at the top
- `css/project.css`: case-study styles
- `js/room.js`: the scene: layout, gallery, live sky, weather and lamps
- `img/room/`: the room photo, window trim, picture lights, lamp, turntable, and the window's summer/autumn/winter layers

## How the homepage works

- The room is one scene in photo pixels, scaled as a whole. `layout()` in `js/room.js` sets the scale from the window size and the width of the intro column. Below 980px wide (or under 560px tall) the page stacks: intro, room, a "Selected work" list, then the footer.
- Frame and project data are in `FRAMES` and `PROJECTS` in `js/room.js`. Hovering a frame shows a caption; clicking opens a side panel that links to the case study.
- The window uses the real sun position for Creston, BC, with rain, snow and night tinting. The lamps switch on as the room darkens.

## Previewing

Open `index.html` in a browser. URL parameters preview other times and weather:

- `?hour=21.5`: a fixed hour, Creston time (0–24)
- `?season=midsummer`, `autumn` or `midwinter`
- `?rainRate=8` (mm/h) and `?snowRate=3` (cm/h) set how heavy the Rain and Snow previews are

## Still placeholders

Project names, art and text; the track name; the temperature ("—°"). Live weather and music aren't connected yet.
