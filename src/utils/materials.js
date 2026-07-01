import * as THREE from 'three'

export const textureMap = {
    pedals: '/textures/flower_baked.webp',
    path: '/textures/ground+path.webp',
    Plane: '/textures/ground+path.webp',
    Tree: '/textures/treeblossom.webp',
    Rocks: '/textures/rock.webp'
}

export const getTextureKey = (object) => {
    const names = [object.name, object.parent?.name].filter(Boolean)
    return Object.keys(textureMap).find((key) =>
        names.some((name) => name.includes(key))
    )
}

export const createLitMaterial = (textureKey, textures) => {
    const isFlower = textureKey === 'pedals'
    const isTree = textureKey === 'Tree'

    const material = new THREE.MeshStandardMaterial({
        map: textures[textureKey],
        transparent: isFlower,
        roughness: isFlower ? 0.85 : 0.95,
        metalness: 0,
        side: isFlower ? THREE.DoubleSide : THREE.FrontSide,
    })

    if (isFlower) {
        material.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            alphaMap: textures.pedals,
        })
    }

    if (isTree) {
        // Reuse the baked texture as the emissive map so the bloom
        // blossoms glow while the bark stays dark, matching the bake's
        // own luminance — no extra texture load, no post-processing.
        material.emissiveMap = textures.Tree
        material.emissive = new THREE.Color('#aec4ff')
        material.emissiveIntensity = 3.5
    }

    // Set shadowmap
    // if (shadows) {
    //     gl.shadowMap.enabled = true
    //     if (typeof shadows === 'object') Object.assign(gl.shadowMap, shadows)
    //     else gl.shadowMap.type = THREE.PCFSoftShadowMap
    // }

    return material
}

export const applyMaterials = (object, textures) => {
    object.traverse((child) => {
        if (!child.isMesh) return

        // Every mesh should be able to receive shadows, even ones that don't
        // match a known texture key (e.g. an oddly-named ground/floor node)

        const textureKey = getTextureKey(child)
        if (!textureKey) return

        child.material = createLitMaterial(textureKey, textures)
        child.castShadow = textureKey === 'pedals'
    })
}