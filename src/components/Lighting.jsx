import { useControls } from 'leva'

// Hardcoded fallback used in production builds (and as the schema default in dev).
// Leva is dev-tooling only — it should never run outside `npm run dev`, partly for
// bundle size and partly because of a zustand version mismatch between leva and
// drei that crashes minified production builds.
const SUN_DEFAULTS = { moonColor: '#aec4ff', moonIntensity: 1.8, glowIntensity: 0.4 }

export default function Lighting() {
    // import.meta.env.DEV is a build-time constant (true in `npm run dev`, false in
    // `npm run build`), so this branch is fixed for the lifetime of a given bundle —
    // it never actually toggles at runtime, which is what the "no conditional hooks"
    // rule is protecting against.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { moonColor, moonIntensity, glowIntensity } = import.meta.env.DEV
        ? useControls('Moon', {
              moonColor: SUN_DEFAULTS.moonColor,
              moonIntensity: { value: SUN_DEFAULTS.moonIntensity, min: 0, max: 6, step: 0.1 },
              glowIntensity: { value: SUN_DEFAULTS.glowIntensity, min: 0, max: 3, step: 0.1 },
          })
        : SUN_DEFAULTS

    return (
        <>
            <ambientLight color={0x2a3d66} intensity={0.55} />
            <hemisphereLight color={0x6688cc} groundColor={0x101820} intensity={0.6} />

            <directionalLight
                color={moonColor}
                intensity={moonIntensity}
                position={[-18, 34, 12]}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.0002}
                shadow-normalBias={0.015}
                shadow-radius={2}
                shadow-camera-near={1}
                shadow-camera-far={120}
                shadow-camera-left={-55}
                shadow-camera-right={55}
                shadow-camera-top={55}
                shadow-camera-bottom={-55}
            />

            <directionalLight color={0x5577bb} intensity={0.35} position={[16, 8, -20]} />

            {/* Glow halo around the sun position — kept the same color so it stays cohesive */}
            <pointLight color={moonColor} intensity={glowIntensity} distance={80} position={[-18, 34, 12]} />
        </>
    )
}