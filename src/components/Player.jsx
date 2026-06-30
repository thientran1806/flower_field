import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, CuboidCollider } from '@react-three/rapier'
import { PointerLockControls } from '@react-three/drei'

const SPEED = 6
const PLAYER_HEIGHT = 1.7
const CAPSULE_RADIUS = 0.35
const CAPSULE_HALF_HEIGHT = (PLAYER_HEIGHT - CAPSULE_RADIUS * 2) / 2
// Raise this to lift the camera higher above the body (e.g. to see over the flowers)
const CAMERA_HEIGHT_OFFSET = PLAYER_HEIGHT * 2.8
const START_POSITION = [-13, 5, 37]
// Horizontal distance from the origin the player is allowed to walk.
// Tune this to match the actual radius/half-size of your ground plane.
const BOUNDARY_RADIUS = 38
const JUMP_FORCE = 7
// Half-extents of the flat sensor pad at the player's feet used for ground detection
const FOOT_SENSOR_HALF_EXTENTS = [CAPSULE_RADIUS * 0.9, 0.05, CAPSULE_RADIUS * 0.9]
const FOOT_SENSOR_OFFSET = -(CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS)

export default function Player() {
    const bodyRef = useRef()
    const { camera } = useThree()

    const keys = useRef({ forward: false, backward: false, left: false, right: false, jumpRequested: false })
    const frontVector = useRef(new THREE.Vector3())
    const sideVector = useRef(new THREE.Vector3())
    const moveDirection = useRef(new THREE.Vector3())
    const yawEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
    const cameraEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
    // Counts overlapping ground contacts rather than a plain boolean, so standing with
    // feet over e.g. two adjacent ground tiles doesn't flicker "not grounded" when one ends
    const groundContacts = useRef(0)
    const isGrounded = useRef(false)

    useEffect(() => {
        const setKey = (code, value) => {
            switch (code) {
                case 'KeyW':
                case 'ArrowUp':
                    keys.current.forward = value
                    break
                case 'KeyS':
                case 'ArrowDown':
                    keys.current.backward = value
                    break
                case 'KeyA':
                case 'ArrowLeft':
                    keys.current.left = value
                    break
                case 'KeyD':
                case 'ArrowRight':
                    keys.current.right = value
                    break
                case 'Space':
                    // Only fire on the press, not the release, so it acts as a single jump request
                    if (value) keys.current.jumpRequested = true
                    break
                default:
                    break
            }
        }

        const onKeyDown = (e) => {
            if (e.code === 'Space') e.preventDefault() // stop the page from scrolling
            setKey(e.code, true)
        }
        const onKeyUp = (e) => setKey(e.code, false)

        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
        }
    }, [])

    useFrame(() => {
        const body = bodyRef.current
        if (!body) return

        const { forward, backward, left, right } = keys.current

        frontVector.current.set(0, 0, (backward ? 1 : 0) - (forward ? 1 : 0))
        sideVector.current.set((left ? 1 : 0) - (right ? 1 : 0), 0, 0)
        moveDirection.current.subVectors(frontVector.current, sideVector.current)

        const velocity = body.linvel()
        let verticalVelocity = velocity.y

        if (keys.current.jumpRequested) {
            if (isGrounded.current) {
                verticalVelocity = JUMP_FORCE
            }
            keys.current.jumpRequested = false // consume the request either way, no buffered/double jumps
        }

        if (moveDirection.current.lengthSq() === 0) {
            body.setLinvel({ x: 0, y: verticalVelocity, z: 0 }, true)
        } else {
            // Only use the camera's yaw (not pitch) so looking up/down doesn't tilt movement
            cameraEuler.current.setFromQuaternion(camera.quaternion, 'YXZ')
            yawEuler.current.y = cameraEuler.current.y

            moveDirection.current.normalize().multiplyScalar(SPEED).applyEuler(yawEuler.current)
            body.setLinvel({ x: moveDirection.current.x, y: verticalVelocity, z: moveDirection.current.z }, true)
        }

        // Keep the player from walking off the edge of the ground plane
        const position = body.translation()
        const horizontalDistSq = position.x * position.x + position.z * position.z

        if (horizontalDistSq > BOUNDARY_RADIUS * BOUNDARY_RADIUS) {
            const horizontalDist = Math.sqrt(horizontalDistSq)
            const scale = BOUNDARY_RADIUS / horizontalDist
            const clampedX = position.x * scale
            const clampedZ = position.z * scale

            body.setTranslation({ x: clampedX, y: position.y, z: clampedZ }, true)

            // Kill most of the outward velocity so the player doesn't keep pushing into the boundary
            const outVelocity = body.linvel()
            body.setLinvel({ x: outVelocity.x * 0.2, y: outVelocity.y, z: outVelocity.z * 0.2 }, true)

            camera.position.set(clampedX, position.y + CAMERA_HEIGHT_OFFSET, clampedZ)
        } else {
            camera.position.set(position.x, position.y + CAMERA_HEIGHT_OFFSET, position.z)
        }
    })

    return (
        <>
            <PointerLockControls />
            <RigidBody
                ref={bodyRef}
                colliders={false}
                mass={1}
                friction={0}
                type="dynamic"
                position={START_POSITION}
                enabledRotations={[false, false, false]}
            >
                <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} />
                {/* Sensor pad at the feet — overlap events drive ground detection instead of a per-frame raycast */}
                <CuboidCollider
                    args={FOOT_SENSOR_HALF_EXTENTS}
                    position={[0, FOOT_SENSOR_OFFSET, 0]}
                    sensor
                    onIntersectionEnter={() => {
                        groundContacts.current += 1
                        isGrounded.current = true
                    }}
                    onIntersectionExit={() => {
                        groundContacts.current = Math.max(0, groundContacts.current - 1)
                        isGrounded.current = groundContacts.current > 0
                    }}
                />
            </RigidBody>
        </>
    )
}