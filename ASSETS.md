# Asset sources and licenses

All textures are fetched by `node scripts/fetch-assets.mjs` into `public/textures/`
(which is not committed). Re-run the script after a fresh clone; it is idempotent.

## Textures — Solar System Scope

**License: CC BY 4.0** — <https://www.solarsystemscope.com/textures/>
(maps based on NASA elevation/imagery data; distributed by INOVE)

| Local file | Source |
| --- | --- |
| sun.jpg | https://www.solarsystemscope.com/textures/download/2k_sun.jpg |
| mercury.jpg | https://www.solarsystemscope.com/textures/download/2k_mercury.jpg |
| venus.jpg | https://www.solarsystemscope.com/textures/download/2k_venus_atmosphere.jpg |
| earth_day.jpg | https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg |
| earth_night.jpg | https://www.solarsystemscope.com/textures/download/2k_earth_nightmap.jpg |
| earth_clouds.jpg | https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg |
| moon.jpg | https://www.solarsystemscope.com/textures/download/2k_moon.jpg |
| mars.jpg | https://www.solarsystemscope.com/textures/download/2k_mars.jpg |
| jupiter.jpg | https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg |
| saturn.jpg | https://www.solarsystemscope.com/textures/download/2k_saturn.jpg |
| saturn_rings.png | https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png |
| uranus.jpg | https://www.solarsystemscope.com/textures/download/2k_uranus.jpg |
| neptune.jpg | https://www.solarsystemscope.com/textures/download/2k_neptune.jpg |
| stars_milky_way.jpg | https://www.solarsystemscope.com/textures/download/8k_stars_milky_way.jpg |
| hi/earth_day_8k.jpg | https://www.solarsystemscope.com/textures/download/8k_earth_daymap.jpg |
| hi/earth_night_8k.jpg | https://www.solarsystemscope.com/textures/download/8k_earth_nightmap.jpg |
| hi/jupiter_8k.jpg | https://www.solarsystemscope.com/textures/download/8k_jupiter.jpg |
| hi/saturn_8k.jpg | https://www.solarsystemscope.com/textures/download/8k_saturn.jpg |

## Known deviations from the spec (tracked for M6)

- **KTX2/Basis conversion** is not wired up yet. Solar System Scope ships JPG/PNG;
  conversion with `toktx` or gltf-transform lands with the progressive-loading
  work in M6. The fetch script is the single place to hook it.
- **Earth normal/specular maps**: Solar System Scope distributes these only as
  TIFF, which three.js cannot load directly. Until converted maps are added,
  the Earth shader derives an ocean mask from the day-map color for the sun
  glint. Revisit in M6 (NASA Visible Earth has alternatives).
- Sun granulation, the corona, star points and shadow visualizations are
  procedural (no asset).
