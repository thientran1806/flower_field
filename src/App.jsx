import { Suspense } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Leva } from 'leva'
import Lighting from './components/Lighting.jsx'
import Environment from './components/Environment.jsx'
import Player from './components/Player.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'

export default function App() {
    return (
        <>
            {import.meta.env.DEV && <Leva />}
            <LoadingScreen />
            <Canvas
                shadows
                dpr={[1, 1.5]}
                camera={{ fov: 55, near: 0.1, far: 200 }}
                gl={{ antialias: true }}
                onCreated={({ gl, scene }) => {
                    gl.toneMapping = THREE.ACESFilmicToneMapping
                    gl.toneMappingExposure = 1.15
                    scene.background = new THREE.Color(0x0a1424)
                    scene.fog = new THREE.FogExp2(0x0a1424, 0.018)
                }}
            >
                <Suspense fallback={null}>
                    <Physics gravity={[0, -9.81, 0]}>
                        <Lighting />
                        <Environment />
                        <Player />
                    </Physics>
                </Suspense>
            </Canvas>
        </>
    )
}