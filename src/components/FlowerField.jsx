import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createLitMaterial } from '../utils/materials.js'

const FLOWER_COUNT = 200
const FIELD_SIZE = 40
const PATH_SAMPLE_HEIGHT = 12
const FLOWER_SCALE_MIN = 0.1
const FLOWER_SCALE_MAX = 0.3

// Scratch objects reused every frame/build to avoid garbage collection churn
const dummy = new THREE.Object3D()
const windEuler = new THREE.Euler()
const windQuaternion = new THREE.Quaternion()
const pathRaycaster = new THREE.Raycaster()
const pathRayOrigin = new THREE.Vector3()
const downVector = new THREE.Vector3(0, -1, 0)

const sampleFlowerPosition = () => {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.sqrt(Math.random()) * FIELD_SIZE
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }
}

export default function FlowerField({ pedalsGeometry, pedalsTransform, pathMesh, textures }) {
    const meshRef = useRef()
    const windData = useRef([])

    const isOnPath = (x, z) => {
        if (!pathMesh) return false
        pathRayOrigin.set(x, PATH_SAMPLE_HEIGHT, z)
        pathRaycaster.set(pathRayOrigin, downVector)
        return pathRaycaster.intersectObject(pathMesh, false).length > 0
    }

    useEffect(() => {
        const instances = meshRef.current
        if (!instances || !pedalsTransform) return

        const { position: templatePosition, quaternion: templateQuaternion } = pedalsTransform

        const data = []
        let placed = 0
        let attempts = 0
        const maxAttempts = FLOWER_COUNT * 40

        while (placed < FLOWER_COUNT && attempts < maxAttempts) {
            attempts += 1

            const { x, z } = sampleFlowerPosition()
            if (isOnPath(x, z)) continue

            const scale = FLOWER_SCALE_MIN + Math.random() * (FLOWER_SCALE_MAX - FLOWER_SCALE_MIN)

            dummy.position.set(x, templatePosition.y, z)
            dummy.quaternion.copy(templateQuaternion)
            dummy.scale.setScalar(scale)
            dummy.updateMatrix()
            instances.setMatrixAt(placed, dummy.matrix)

            data.push({
                position: dummy.position.clone(),
                baseQuaternion: dummy.quaternion.clone(),
                scale,
                phase: Math.random() * Math.PI * 2,
                speed: 0.65 + Math.random() * 0.55,
                strength: 0.05 + Math.random() * 0.05,
                flutter: 0.012 + Math.random() * 0.018,
            })

            placed += 1
        }

        instances.count = placed
        instances.instanceMatrix.needsUpdate = true
        windData.current = data
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pedalsTransform, pathMesh])

    useFrame(({ clock }) => {
        const instances = meshRef.current
        if (!instances || windData.current.length === 0) return

        const elapsed = clock.getElapsedTime()
        const gust = (Math.sin(elapsed * 0.32) + Math.sin(elapsed * 0.15 + 1.1) * 0.55) * 0.5 + 0.5
        const globalWind = 0.55 + gust * 0.75

        windData.current.forEach((flower, i) => {
            const { position, baseQuaternion, scale, phase, speed, strength, flutter } = flower
            const t = elapsed * speed + phase
            const sway = strength * globalWind

            dummy.position.copy(position)
            dummy.quaternion.copy(baseQuaternion)

            windEuler.set(
                Math.sin(t * 1.35) * sway + Math.sin(t * 2.6 + phase) * flutter,
                0,
                Math.cos(t * 1.05 + phase * 0.6) * sway * 0.55 + Math.sin(t * 3.1) * flutter * 0.5,
            )
            windQuaternion.setFromEuler(windEuler)
            dummy.quaternion.multiply(windQuaternion)

            dummy.scale.setScalar(scale)
            dummy.updateMatrix()
            instances.setMatrixAt(i, dummy.matrix)
        })

        instances.instanceMatrix.needsUpdate = true
    })

    if (!pedalsGeometry) return null

    return (
        <instancedMesh
            ref={meshRef}
            args={[pedalsGeometry, createLitMaterial('pedals', textures), FLOWER_COUNT]}
            castShadow
            receiveShadow
            frustumCulled={false}
        />
    )
}