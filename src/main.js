import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';

const canvas = document.querySelector('.experience-canvas')

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1424);
scene.fog = new THREE.FogExp2(0x0a1424, 0.018);

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const textureLoader = new THREE.TextureLoader();

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const loader = new GLTFLoader()
loader.setDRACOLoader(dracoLoader)

const textureMap = {
    pedals: '/textures/flower_baked.webp',
    path: '/textures/ground.webp',
    Plane: '/textures/ground.webp',
}

const loadedTextures = {}
Object.entries(textureMap).forEach(([key, path]) => {
    const texture = textureLoader.load(path)
    texture.flipY = false
    texture.colorSpace = THREE.SRGBColorSpace
    loadedTextures[key] = texture
})

const FLOWER_COUNT = 90
const FIELD_SIZE = 40
const PATH_SAMPLE_HEIGHT = 12
const FLOWER_SCALE_MIN = 0.05
const FLOWER_SCALE_MAX = 0.13
const clock = new THREE.Clock()

let flowerInstances = null
let pathMeshRef = null
const flowerWindData = []
const pathRaycaster = new THREE.Raycaster()
const pathRayOrigin = new THREE.Vector3()
const downVector = new THREE.Vector3(0, -1, 0)
const dummy = new THREE.Object3D()
const windEuler = new THREE.Euler()
const windQuaternion = new THREE.Quaternion()

const templatePosition = new THREE.Vector3()
const templateQuaternion = new THREE.Quaternion()
const templateScale = new THREE.Vector3()

const getTextureKey = (object) => {
    const names = [object.name, object.parent?.name].filter(Boolean)
    return Object.keys(textureMap).find((key) => names.some((name) => name.includes(key)))
}

const createLitMaterial = (textureKey) => {
    const isFlower = textureKey === 'pedals'
    const material = new THREE.MeshStandardMaterial({
        map: loadedTextures[textureKey],
        transparent: isFlower,
        alphaTest: isFlower ? 0.08 : 0,
        roughness: isFlower ? 0.85 : 0.95,
        metalness: 0,
        side: isFlower ? THREE.DoubleSide : THREE.FrontSide,
    })

    if (isFlower) {
        material.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            alphaMap: loadedTextures.pedals,
            alphaTest: 0.08,
        })
    }

    return material
}

const applyMaterials = (object) => {
    object.traverse((child) => {
        if (!child.isMesh) return

        const textureKey = getTextureKey(child)
        if (!textureKey) return

        child.material = createLitMaterial(textureKey)
        child.receiveShadow = true
        child.castShadow = textureKey === 'pedals'
    })
}

const isOnPath = (x, z) => {
    if (!pathMeshRef) return false

    pathRayOrigin.set(x, PATH_SAMPLE_HEIGHT, z)
    pathRaycaster.set(pathRayOrigin, downVector)
    return pathRaycaster.intersectObject(pathMeshRef, false).length > 0
}

const sampleFlowerPosition = () => {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.sqrt(Math.random()) * FIELD_SIZE
    return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
    }
}

const createFlowerField = (pedalsMesh, pedalsNode) => {
    pedalsNode.updateWorldMatrix(true, false)
    pedalsMesh.updateWorldMatrix(true, false)
    pedalsMesh.matrixWorld.decompose(templatePosition, templateQuaternion, templateScale)

    const flowerMaterial = createLitMaterial('pedals')

    flowerInstances = new THREE.InstancedMesh(
        pedalsMesh.geometry,
        flowerMaterial,
        FLOWER_COUNT,
    )
    flowerInstances.frustumCulled = false
    flowerInstances.castShadow = true
    flowerInstances.receiveShadow = true

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
        dummy.rotateY(Math.random() * Math.PI * 2)
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        flowerInstances.setMatrixAt(placed, dummy.matrix)

        flowerWindData.push({
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

    flowerInstances.count = placed
    flowerInstances.instanceMatrix.needsUpdate = true
    scene.add(flowerInstances)
}

const animateWind = (elapsed) => {
    if (!flowerInstances) return

    const gust = (Math.sin(elapsed * 0.32) + Math.sin(elapsed * 0.15 + 1.1) * 0.55) * 0.5 + 0.5
    const globalWind = 0.55 + gust * 0.75

    flowerWindData.forEach((flower, i) => {
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
        flowerInstances.setMatrixAt(i, dummy.matrix)
    })

    flowerInstances.instanceMatrix.needsUpdate = true
}

const setupMoonLighting = () => {
    const ambient = new THREE.AmbientLight(0x2a3d66, 0.55)
    scene.add(ambient)

    const hemi = new THREE.HemisphereLight(0x6688cc, 0x101820, 0.6)
    scene.add(hemi)

    const moon = new THREE.DirectionalLight(0xaec4ff, 1.8)
    moon.position.set(-18, 34, 12)
    moon.target.position.set(0, 0, 0)
    scene.add(moon.target)
    moon.castShadow = true
    moon.shadow.mapSize.set(2048, 2048)
    moon.shadow.bias = -0.0002
    moon.shadow.normalBias = 0.015
    moon.shadow.radius = 2
    moon.shadow.camera.near = 1
    moon.shadow.camera.far = 120
    moon.shadow.camera.left = -55
    moon.shadow.camera.right = 55
    moon.shadow.camera.top = 55
    moon.shadow.camera.bottom = -55
    scene.add(moon)

    const fill = new THREE.DirectionalLight(0x5577bb, 0.35)
    fill.position.set(16, 8, -20)
    scene.add(fill)

    const moonGlow = new THREE.PointLight(0x88aaff, 0.4, 80)
    moonGlow.position.copy(moon.position)
    scene.add(moonGlow)
}

setupMoonLighting()

loader.load('/models/flower-v1.glb', (glb) => {
    applyMaterials(glb.scene)
    scene.add(glb.scene)

    const pathMesh = glb.scene.getObjectByName('path')
    if (pathMesh?.isMesh) {
        pathMeshRef = pathMesh
        pathMeshRef.updateWorldMatrix(true, true)
    }

    const pedalsNode = glb.scene.getObjectByName('pedals')
    const pedalsMesh = pedalsNode?.isMesh
        ? pedalsNode
        : pedalsNode?.children.find((child) => child.isMesh)

    if (pedalsMesh && pedalsNode) {
        pedalsNode.visible = false
        createFlowerField(pedalsMesh, pedalsNode)
    }
}, undefined, (error) => {
    console.error('Failed to load flower model:', error)
})

const camera = new THREE.PerspectiveCamera(
    55,
    sizes.width / sizes.height,
    0.1,
    200
)
camera.position.set(0, 16, 30)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.target.set(0, 0, 0)
controls.maxPolarAngle = Math.PI * 0.48
controls.minDistance = 8
controls.maxDistance = 80
controls.update();

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const render = () => {
    const elapsed = clock.getElapsedTime()
    animateWind(elapsed)
    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(render)
}

render()
