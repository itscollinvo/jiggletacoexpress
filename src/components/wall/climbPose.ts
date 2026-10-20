/**
 * The climbing animation, as a pure function: scroll position in, pose out.
 *
 * No baked animation clip is used. Instead we blend between two mirrored
 * "key poses" (left hand high + right foot high, and the opposite) as you
 * scroll, which is how a climber alternates reaching and stepping. Because
 * the pose comes from scroll progress, scrolling back down plays the climb
 * in reverse, and stopping mid-move freezes the climber mid-move.
 *
 * Angles are in radians and use one convention for both sides, for a
 * climber facing the wall: positive arm = raise toward the sky, positive
 * elbow = bend the forearm in toward the head, positive hipOut = swing the
 * thigh out to the side, positive knee = bend the shin back down.
 * ClimberModel turns these into bone rotations.
 */

export interface Pose {
  lArm: number;
  rArm: number;
  lElbow: number;
  rElbow: number;
  lHipOut: number;
  rHipOut: number;
  lKnee: number;
  rKnee: number;
  /** Small whole-body sway left/right, radians. */
  sway: number;
  /** Small vertical bob in model units (pull-up effort). */
  bob: number;
}

// Left hand reaching high, right foot stepping high, right arm pulling.
const REACH_LEFT: Pose = {
  lArm: 3.0, lElbow: 0,
  rArm: 1.8, rElbow: 1.1,
  lHipOut: 0.45, lKnee: 0.3,
  rHipOut: 1.15, rKnee: 1.5,
  sway: 0.08, bob: 0,
};

// The mirror image.
const REACH_RIGHT: Pose = {
  lArm: 1.8, lElbow: 1.1,
  rArm: 3.0, rElbow: 0,
  lHipOut: 1.15, lKnee: 1.5,
  rHipOut: 0.45, rKnee: 0.3,
  sway: -0.08, bob: 0,
};

/** How many reach/step moves it takes to climb the whole page. */
const MOVES_PER_PAGE = 22;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function poseAt(
  progress: number,
  boltStops: number[],
  time: number,
): Pose {
  // One full cycle (left move + right move) per two moves. The cosine
  // turns a straight ramp into ease-in/ease-out, so each limb accelerates
  // off a hold and slows into the next one instead of moving robotically.
  const cycle = (progress * MOVES_PER_PAGE) / 2;
  const t = 0.5 - 0.5 * Math.cos(cycle * Math.PI * 2);

  const pose = {} as Pose;
  for (const k of Object.keys(REACH_LEFT) as (keyof Pose)[]) {
    pose[k] = mix(REACH_LEFT[k], REACH_RIGHT[k], t);
  }
  // Pull-up effort: the body rises mid-move.
  pose.bob = Math.sin(t * Math.PI) * 0.06;

  // Clipping: as the climber reaches a bolt, the right hand comes across
  // to clip the rope in. `near` peaks (1) at the bolt and fades out over
  // ±2% of the page around it.
  let near = 0;
  for (const stop of boltStops) {
    near = Math.max(near, 1 - Math.abs(progress - stop) / 0.02);
  }
  if (near > 0) {
    const n = near * near * (3 - 2 * near); // smoothstep
    pose.rArm = mix(pose.rArm, 2.0, n);
    pose.rElbow = mix(pose.rElbow, 1.5, n);
  }

  // Breathing when you stop scrolling, so the climber never looks frozen.
  pose.sway += Math.sin(time * 1.3) * 0.02;
  pose.bob += Math.sin(time * 2.1) * 0.01;

  return pose;
}
