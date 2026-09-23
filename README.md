# musicforrobots.com

Landing page for TROUBLE SHOOTERS. Plain static HTML, served by GitHub Pages.

- `index.html` is the whole page (CSS inline, no JS, no build step).
- `assets/sprites/` are copied from the game repo (`Assets/Resources/Sprites/`). Sprite strips animate in CSS via `--w/--h` (cell px), `--n` (frames), `--s` (scale).
- `assets/fonts/` are Orbitron (SIL OFL, see LICENSE.txt) and the game's own WARDEN Terminal face.
- `assets/og.png` is the 1200x630 link-preview image.
- `assets/video/` is the hero loop, re-encoded from `trailer/trouble_shooters_hero.mp4` (no audio, x264 CRF 33 at 1080p / CRF 31 at 720p for phones, faststart). Re-encode rather than dropping in a raw export: the source is 61 MB.
- `CNAME` binds the custom domain; `.nojekyll` skips Jekyll processing.

Preview locally: `python -m http.server 8750` and open http://localhost:8750
