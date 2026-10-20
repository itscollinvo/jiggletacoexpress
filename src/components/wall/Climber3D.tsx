"use client";

/**
 * The 3D climber scene (drawn into a SceneSlot over the wall).
 *
 * Scroll progress arrives as a prop, but the pose is computed inside
 * useFrame from a *damped* copy of it. Lenis already smooths the wheel;
 * this extra easing hides the steps between scroll events entirely, so
 * limbs glide even on a jumpy trackpad.
 */

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import ClimberModel from "./ClimberModel";
import { poseAt, type Pose } from "./climbPose";

interface Props {
  progress: number;
  boltStops: number[];
}

export default function Climber3D({ progress, boltStops }: Props) {
  const shown = useRef(progress);
  const time = useRef(0);
  const pose = useRef<Pose | null>(null);
  // Latest props for useFrame (its callback is created once and would
  // otherwise keep seeing the values from the first render).
  const latest = useRef({ progress, boltStops });
  useEffect(() => {
    latest.current = { progress, boltStops };
  }, [progress, boltStops]);

  useFrame((_, dt) => {
    time.current += dt;
    shown.current = THREE.MathUtils.damp(
      shown.current,
      latest.current.progress,
      10,
      dt,
    );
    pose.current = poseAt(shown.current, latest.current.boltStops, time.current);
  });

  return (
    <>
      {/* Slightly turned from straight-behind so the head reads as a head. */}
      <PerspectiveCamera makeDefault position={[0, 1.05, 5]} fov={32} />
      <ambientLight intensity={1.6} />
      <directionalLight position={[2, 4, 3]} intensity={2.2} />
      <Suspense fallback={null}>
        <group rotation={[0, Math.PI + 0.3, 0]}>
          <ClimberModel getPose={() => pose.current ?? poseAt(0, [], 0)} />
        </group>
      </Suspense>
    </>
  );
}
