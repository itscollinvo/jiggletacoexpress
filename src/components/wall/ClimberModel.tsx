"use client";

/**
 * The climber: a CC0 robot by Quaternius (see public/models/CREDITS.md),
 * posed every frame from code instead of a baked animation.
 *
 * How the posing works:
 *   Each limb is a "bone" (a joint in the model's skeleton). Rotating a
 *   bone rotates everything attached below it, so raising the upper arm
 *   carries the forearm and hand with it.
 *
 *   The tricky part is axes. Every bone has its own local axes, and in
 *   this model (converted from another file format) they point in odd
 *   directions. Rather than reverse-engineer each one, rotateInWorld()
 *   takes an axis in *world* space (Z = the axis pointing out of the
 *   wall at you) and converts it into the bone's parent space:
 *     local = parent⁻¹ · worldRotation · parent · bone
 *   So "rotate the left arm 2.7 rad around Z" means the same thing for
 *   every bone, which is what makes climbPose.ts readable.
 *
 *   Each frame we reset every bone to its rest pose and re-apply the
 *   rotations, parents before children, so nothing accumulates.
 *
 * Two quirks of this particular rig:
 *   - The hands are skinned meshes, so the model is cloned with
 *     SkeletonUtils.clone. A plain .clone() leaves skinned meshes pointing
 *     at the original skeleton.
 *   - The feet are separate IK targets, not children of the legs. After
 *     posing the legs we move each foot to where the shin now ends.
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Pose } from "./climbPose";

export const CLIMBER_URL = "/models/climber.glb";

const Z = new THREE.Vector3(0, 0, 1);
const qWorld = new THREE.Quaternion();
const qParent = new THREE.Quaternion();
const qParentInv = new THREE.Quaternion();

function rotateInWorld(bone: THREE.Object3D, axis: THREE.Vector3, angle: number) {
  if (!angle || !bone.parent) return;
  bone.parent.getWorldQuaternion(qParent);
  qParentInv.copy(qParent).invert();
  qWorld.setFromAxisAngle(axis, angle);
  bone.quaternion.premultiply(qParent).premultiply(qWorld).premultiply(qParentInv);
  bone.updateMatrixWorld(true);
}

interface Props {
  /** Called every frame; returns the pose to show. */
  getPose: () => Pose;
}

export default function ClimberModel({ getPose }: Props) {
  const { scene } = useGLTF(CLIMBER_URL);

  const model = useMemo(() => {
    const m = cloneSkinned(scene);
    // The source is ~4.46 units tall with its feet at y = 0. Scale it to
    // 2 units. (Box3 can't measure it: skinned meshes report their
    // un-posed bounds.)
    m.scale.setScalar(2 / 4.46);
    return m;
  }, [scene]);

  // Everything the per-frame code touches lives in refs. (React's rules
  // treat values from useMemo as read-only; three.js objects are meant to
  // be mutated every frame, so we hand them over through a ref instead.)
  const root = useRef<THREE.Group>(null);
  const rig = useRef<Rig | null>(null);

  useEffect(() => {
    rig.current = buildRig(model);
  }, [model]);

  useFrame(() => {
    const r = rig.current;
    if (!r || !root.current) return;
    const p = getPose();

    r.rest.forEach((q, bone) => bone.quaternion.copy(q));
    root.current.position.y = p.bob;
    root.current.rotation.z = p.sway;
    root.current.updateMatrixWorld(true);

    // Facing the wall, the left limbs are on screen-left, so "up/out" is
    // a negative (clockwise) Z rotation for them and positive for the right.
    rotateInWorld(r.lUpperArm, Z, -p.lArm);
    rotateInWorld(r.lForearm, Z, -p.lElbow);
    rotateInWorld(r.rUpperArm, Z, p.rArm);
    rotateInWorld(r.rForearm, Z, p.rElbow);
    rotateInWorld(r.lThigh, Z, -p.lHipOut);
    rotateInWorld(r.lShin, Z, p.lKnee);
    rotateInWorld(r.rThigh, Z, p.rHipOut);
    rotateInWorld(r.rShin, Z, -p.rKnee);

    // Re-attach the IK feet to the ends of the shins.
    placeFoot(r.lFoot, r.lShin, r.lFootInShin);
    placeFoot(r.rFoot, r.rShin, r.rFootInShin);
  });

  return (
    <group ref={root}>
      <primitive object={model} />
    </group>
  );
}

interface Rig {
  lUpperArm: THREE.Object3D; rUpperArm: THREE.Object3D;
  lForearm: THREE.Object3D; rForearm: THREE.Object3D;
  lThigh: THREE.Object3D; rThigh: THREE.Object3D;
  lShin: THREE.Object3D; rShin: THREE.Object3D;
  lFoot: THREE.Object3D; rFoot: THREE.Object3D;
  /** Rest-pose rotation of every bone we pose. */
  rest: Map<THREE.Object3D, THREE.Quaternion>;
  /** Where each foot sits in its shin's local space, at rest. */
  lFootInShin: THREE.Vector3;
  rFootInShin: THREE.Vector3;
}

function buildRig(model: THREE.Object3D): Rig {
  // The loader strips "." from names (it's reserved in animation paths),
  // so "UpperArm.L" is "UpperArmL" here. Several meshes share their
  // bone's name, so skip meshes.
  const find = (name: string) => {
    let hit: THREE.Object3D | undefined;
    model.traverse((o) => {
      if (!hit && o.name === name && !(o as THREE.Mesh).isMesh) hit = o;
    });
    if (!hit) throw new Error(`climber: missing bone ${name}`);
    return hit;
  };
  const bones = {
    lUpperArm: find("UpperArmL"), rUpperArm: find("UpperArmR"),
    lForearm: find("LowerArmL"), rForearm: find("LowerArmR"),
    lThigh: find("UpperLegL"), rThigh: find("UpperLegR"),
    lShin: find("LowerLegL"), rShin: find("LowerLegR"),
    lFoot: find("FootL"), rFoot: find("FootR"),
  };
  const rest = new Map<THREE.Object3D, THREE.Quaternion>();
  for (const [key, bone] of Object.entries(bones)) {
    if (!key.endsWith("Foot")) rest.set(bone, bone.quaternion.clone());
  }
  model.updateMatrixWorld(true);
  const footIn = (foot: THREE.Object3D, shin: THREE.Object3D) =>
    shin.worldToLocal(foot.getWorldPosition(new THREE.Vector3()));
  return {
    ...bones,
    rest,
    lFootInShin: footIn(bones.lFoot, bones.lShin),
    rFootInShin: footIn(bones.rFoot, bones.rShin),
  };
}

const scratch = new THREE.Vector3();
function placeFoot(foot: THREE.Object3D, shin: THREE.Object3D, inShin: THREE.Vector3) {
  scratch.copy(inShin);
  shin.localToWorld(scratch);
  foot.position.copy(foot.parent!.worldToLocal(scratch));
}

useGLTF.preload(CLIMBER_URL);
