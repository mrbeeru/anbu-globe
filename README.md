# Anbu Globe
Github had such a globe on their landing page and I thought it was cool.
This project is a small Vite + TypeScript + Three.js demo that renders an interactive 3D globe in the browser.
The globe auto-rotates, places a few city markers on the surface, and shows a tooltip when a marker is hovered.
Built without AI and I'm proud of it.

## Run locally

```bash
npm install
npm run dev
```

## How the globe is built

The globe is assembled in `src/Globe.ts` with a few separate pieces:

- A `THREE.Scene`, `PerspectiveCamera`, and `WebGLRenderer` create the basic Three.js setup.
- A large `SphereGeometry` with a `MeshPhongMaterial` forms the main ocean sphere.
- A directional light is positioned from the current sun latitude and longitude so the globe has a day/night highlight.
- Orbit controls handle camera movement and enable slow automatic rotation.

The dotted land effect is the main visual trick:

1. The app loads `public/eq_proj.png` into a canvas and reads its pixel data.
2. It distributes around 200,000 sample points over a slightly larger sphere.
3. Each point is converted to UV coordinates with the helper functions in `src/utils.ts`.
4. The matching pixel is sampled from the map image.
5. If that pixel is visible, the code places a tiny circular mesh at that position.
6. All accepted dots are merged into one geometry for better rendering performance.

City indicators are added separately as small circular meshes placed from latitude/longitude coordinates. A raycaster tracks pointer hover so the app can pause rotation and show the tooltip text for the active marker.

<img width="1101" height="1079" alt="image" src="https://github.com/user-attachments/assets/60a01e43-1e8e-4185-b81a-3e6e213f38a0" />
