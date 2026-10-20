"use client";

/**
 * The 3D blob itself: React Three Fiber content, drawn inside a SceneSlot.
 * Loaded lazily by HeroBlob, so none of this ships until it's needed.
 *
 * Every frame (useFrame) we ease the shader's inputs toward their targets
 * instead of setting them directly. That one habit is why everything feels
 * soft: colors blend when the song changes, the bulge swells and settles
 * when the cursor arrives and leaves, and the "breathing" speeds up
 * smoothly when music starts.
 */

import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { fragmentShader, vertexShader } from "./shaders";

export interface BlobColors {
  a: string;
  b: string;
  c: string;
}

interface Props {
  colors: BlobColors;
  playing: boolean;
  /** Phones/tablets: fewer triangles, no cursor bulge. */
  lite: boolean;
}

// Two moods. Playing: livelier surface and a faster "heartbeat".
const MOODS = {
  playing: { speed: 0.4, amplitude: 0.17, beatsPerSecond: 1.6 },
  idle: { speed: 0.15, amplitude: 0.11, beatsPerSecond: 0.5 },
};

/**
 * Frame-rate independent easing. `damp(current, target, 4, dt)` closes a
 * fixed fraction of the gap per *second*, so it feels the same at 30 fps
 * and 144 fps (a fixed `current += (target - current) * 0.1` per frame
 * would run twice as fast on a 120 Hz screen).
 */
const damp = THREE.MathUtils.damp;

export default function AlbumBlob({ colors, playing, lite }: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const pointerTarget = useRef(0); // 1 while hovering, 0 otherwise
  const time = useRef(0);
  const beat = useRef(0);
  const target = useRef(new THREE.Color()); // scratch color, reused

  // The starting uniforms. Created once: a new object every render would
  // make three.js recompile the shader. After mount we never touch this
  // object from React again; useFrame below updates the live values on
  // the material (through a ref), which is how R3F animations avoid
  // re-rendering React 60 times a second.
  const initialUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmplitude: { value: MOODS.idle.amplitude },
      uFrequency: { value: 1.1 }, // lower = fewer, broader bumps
      uPointer: { value: new THREE.Vector3(0, 0, 1) },
      uPointerStrength: { value: 0 },
      uColorA: { value: new THREE.Color(colors.a) },
      uColorB: { value: new THREE.Color(colors.b) },
      uColorC: { value: new THREE.Color(colors.c) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial values only
    [],
  );

  useFrame((_, dt) => {
    const u = material.current?.uniforms;
    if (!u) return;
    const mood = playing ? MOODS.playing : MOODS.idle;

    // Flowing surface: advance noise time at the mood's speed.
    time.current += dt * mood.speed;
    u.uTime.value = time.current;
    u.uAmplitude.value = damp(u.uAmplitude.value, mood.amplitude, 2, dt);

    // Colors drift toward the current album over about a second.
    const k = 1 - Math.exp(-3 * dt);
    u.uColorA.value.lerp(target.current.set(colors.a), k);
    u.uColorB.value.lerp(target.current.set(colors.b), k);
    u.uColorC.value.lerp(target.current.set(colors.c), k);

    // Cursor bulge swells in and relaxes out.
    u.uPointerStrength.value = damp(
      u.uPointerStrength.value,
      pointerTarget.current * 0.25,
      6,
      dt,
    );

    // "Breathing": a gentle scale pulse. Spotify no longer gives apps the
    // real tempo, so playing = a faster pulse, not the actual beat.
    beat.current += dt * mood.beatsPerSecond * Math.PI * 2;
    if (mesh.current) {
      mesh.current.scale.setScalar(1 + Math.sin(beat.current) * 0.025);
      mesh.current.rotation.y += dt * 0.12;
    }
  });

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    const u = material.current?.uniforms;
    if (lite || !mesh.current || !u) return;
    // e.point is where the cursor ray hits the blob, in world space.
    // The shader works in the blob's own (rotating) space, so convert.
    u.uPointer.value.copy(mesh.current.worldToLocal(e.point.clone()));
    pointerTarget.current = 1;
  }

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3.4]} fov={45} />
      <mesh
        ref={mesh}
        onPointerMove={onPointerMove}
        onPointerLeave={() => (pointerTarget.current = 0)}
      >
        {/* An icosphere: a sphere built from evenly sized triangles, so
            the wobble looks the same everywhere (a UV sphere bunches
            triangles at the poles). Detail = how many times each face is
            subdivided; more = smoother, more work for the GPU. */}
        <icosahedronGeometry args={[1, lite ? 24 : 64]} />
        <shaderMaterial
          ref={material}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={initialUniforms}
        />
      </mesh>
    </>
  );
}
