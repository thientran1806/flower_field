# Migrating to React Three Fiber + react-three-rapier

## 1. Install dependencies

```bash
npm install react react-dom three @react-three/fiber @react-three/drei @react-three/rapier
npm install -D @vitejs/plugin-react
```

## 2. Update vite.config.js

Add the React plugin:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
})
```

`@react-three/rapier` ships its WASM binary pre-bundled and works with Vite out of
the box — no extra wasm plugin needed. If you ever see a "top-level await" warning
in dev, add:

```js
optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
}
```

## 3. Update index.html

Your old canvas element is gone — R3F's `<Canvas>` creates its own. Replace:

```html
<canvas class="experience-canvas"></canvas>
<script type="module" src="/main.js"></script>
```

with:

```html
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

## 4. Drop in these files

```
src/
  main.jsx
  App.jsx
  components/
    Lighting.jsx
    Environment.jsx
    FlowerField.jsx
    Player.jsx
  utils/
    materials.js
```

You can delete the old `main.js` once everything renders correctly.

## 5. Controls

- Click the canvas to lock the pointer (required for mouse-look — this is a
  browser security requirement, same as Minecraft-style web games).
- WASD / arrow keys to walk. The capsule body collides with the trimesh
  generated from your GLB's ground + path meshes, so you can't walk through them.
- Esc unlocks the pointer.

## 6. Things you'll likely want to tune

- **`START_POSITION`** in `Player.jsx` — drop height/spawn point. It's set above
  the ground so the capsule falls onto the terrain on load; lower it once you
  confirm collision works, to avoid a falling moment.
- **`CAPSULE_RADIUS` / `PLAYER_HEIGHT`** in `Player.jsx` — collider size.
- **`SPEED`** in `Player.jsx` — walk speed.
- **`colliders="trimesh"`** in `Environment.jsx` — trimesh is accurate but can be
  slow on dense meshes. If your ground/path geo is heavy, consider baking a
  simplified collision mesh, or switch to `colliders="hull"` for a convex
  approximation if exact wall-hugging isn't critical.
- There's no jump yet — easy to add with a `KeyDown: Space` listener that calls
  `body.applyImpulse({ x: 0, y: jumpForce, z: 0 }, true)` when grounded.

## Notes on what changed vs. your old main.js

- `OrbitControls` → `PointerLockControls` (first-person look) since you wanted
  camera collision, which implies a grounded walking camera rather than a free
  orbiting one.
- Manual downward raycast against the path mesh (`isOnPath`) is still used for
  flower placement (keeps flowers off the path) — that part didn't need physics.
- Ground/path collision is now handled by rapier's trimesh collider instead of
  raycasting, so the player physically can't pass through them.
