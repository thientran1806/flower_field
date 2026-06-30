import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF, useTexture, Sparkles } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import { applyMaterials, textureMap } from '../utils/materials.js'
import FlowerField from './FlowerField.jsx'

export default function Environment() {
    const { scene } = useGLTF('/models/flower-v1.glb')
    const textures = useTexture(textureMap)

    // Match the original flipY/colorSpace setup from the textureLoader.load loop
    useMemo(() => {
        Object.values(textures).forEach((texture) => {
            texture.flipY = false
            texture.colorSpace = THREE.SRGBColorSpace
        })
    }, [textures])

    // IMPORTANT: this has to run synchronously during render (useMemo), not in a
    // useEffect. RigidBody's automatic trimesh-collider generation happens in an
    // effect on mount, and child effects fire before the parent's — so if we removed
    // the pedals template in an effect here, RigidBody would already have baked it
    // into the collider by the time we got to it. Doing it here guarantees the
    // template is gone from the scene graph before RigidBody ever sees it.
    const parts = useMemo(() => {
        if (scene.userData.flowerFieldParts) {
            return scene.userData.flowerFieldParts
        }

        applyMaterials(scene, textures)

        const pathMesh = scene.getObjectByName('path')
        if (pathMesh?.isMesh) {
            pathMesh.updateWorldMatrix(true, true)
        }

        // Grab the tree's world position so we can scope sparkles to its
        // canopy instead of scattering them across the whole scene.
        const treeNode = scene.getObjectByName('Tree')
        let treePosition = null
        if (treeNode) {
            treeNode.updateWorldMatrix(true, false)
            treePosition = new THREE.Vector3()
            treeNode.getWorldPosition(treePosition)
        }

        const pedalsNode = scene.getObjectByName('pedals')
        const pedalsMesh = pedalsNode?.isMesh
            ? pedalsNode
            : pedalsNode?.children.find((child) => child.isMesh)

        let pedalsGeometry = null
        let pedalsTransform = null

        if (pedalsMesh && pedalsNode) {
            pedalsNode.updateWorldMatrix(true, false)
            pedalsMesh.updateWorldMatrix(true, false)

            const position = new THREE.Vector3()
            const quaternion = new THREE.Quaternion()
            const scale = new THREE.Vector3()
            pedalsMesh.matrixWorld.decompose(position, quaternion, scale)

            pedalsGeometry = pedalsMesh.geometry
            pedalsTransform = { position, quaternion, scale }

            // Pull the template flower out of the scene entirely, rather than just
            // hiding it — hidden meshes still get baked into the trimesh collider
            // below, which is what was causing the camera to snag on it.
            pedalsNode.parent?.remove(pedalsNode)
        }

        const result = { pedalsGeometry, pedalsTransform, pathMesh, treePosition }
        scene.userData.flowerFieldParts = result
        return result
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scene, textures])

    return (
        <>
            {/* colliders="trimesh" auto-builds static collision geometry from every
                mesh remaining in the GLB (ground + path) */}
            <RigidBody type="fixed" colliders="trimesh" friction={1}>
                <primitive object={scene} />
            </RigidBody>

            {parts.pedalsGeometry && (
                <FlowerField
                    pedalsGeometry={parts.pedalsGeometry}
                    pedalsTransform={parts.pedalsTransform}
                    pathMesh={parts.pathMesh}
                    textures={textures}
                />
                
            )}
            <Sparkles
                size={ 30 }
                scale={ [100, 6, 80] }
                position-y={ 1.5 }
                speed={ 0.2 }
                count={ 300 }
            />

            {parts.treePosition && (
                <Sparkles
                    size={ 40 }
                    scale={ [12, 7, 8] }
                    position={ [
                        parts.treePosition.x,
                        parts.treePosition.y + 4.5, // lift from trunk base into canopy
                        parts.treePosition.z,
                    ] }
                    speed={ 1 }
                    count={ 30 }
                />
            )}
        </>
        
    )
}

useGLTF.preload('/models/flower-v1.glb')