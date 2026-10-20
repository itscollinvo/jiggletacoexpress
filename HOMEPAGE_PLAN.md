# Homepage redesign plan

Goal: keep the calm, text-first homepage, add one 3D centerpiece and a set of
UI/UX details that show front-end skill. Fast on phones, respectful of
reduced motion.

## What we're building

1. **Album-art blob** (beside the headline). A soft, wobbly 3D shape whose
   colors come from the album playing in Now Playing. It bulges toward the
   cursor and "breathes" faster while music is playing. No sound.
   - Spotify removed tempo/energy ("audio features") for new apps in late
     2024, so the pulse is driven by "is something playing", not the beat.
2. **Lead-climbing wall** (between the sidebar and the content). A thin wall
   with a 3D climber. Scrolling down sends the climber up; it clips its rope
   into a quickdraw at each section. Quickdraws are labeled and clickable
   (section nav). On phones it shrinks to a very thin strip with a simple
   2D climber.
3. **Details.** Headline text reveal + "jiggletaco" jiggle on hover; accent
   colors follow the album cover; cursor spotlight on cards; magnetic social
   buttons; smooth scrolling; sections reveal as you scroll.

## Libraries

| Need | Library |
|---|---|
| 3D in React | three.js + @react-three/fiber (v9, React 19) |
| 3D helpers | @react-three/drei (`View` = many scenes, one canvas) |
| Blob surface | custom GLSL shader (noise displacement + fresnel) |
| Album colors | node-vibrant, server side in /api/spotify/now-playing |
| Animation | framer-motion (already installed) |
| Smooth scroll | lenis |
| Climber | CC0 robot by Quaternius, posed procedurally from scroll (no baked clip), compressed with gltf-transform (meshopt) |

## PRs

- [x] **H.1 Foundations.** Libraries, shared 3D canvas (`ThreeProvider`,
  `SceneSlot`), motion tiers (`useMotionTier`), Lenis smooth scroll.
- [x] **H.2 Album-art colors.** Extract palette server-side, cache per album,
  fade accent CSS variables; theme colors as fallback; keep text contrast.
- [x] **H.3 The blob.** Shader, cursor bulge, playing/idle breathing; two-column
  hero on desktop; lighter version on phones.
- [x] **H.4 Headline + micro-interactions.** Text reveal, jiggle, cursor
  spotlight, magnetic buttons.
- [x] **H.5 Scroll reveals.** Existing motion components on scroll; make sure
  in-page anchors work with Lenis.
- [x] **H.6 The wall (no climber).** Strip, bolts aligned to real section
  positions, rope, clickable labeled quickdraws.
- [x] **H.7 The climber.** Model pipeline, scroll-driven position, clip-in move
  at each bolt; 2D version on phones.
- [x] **H.8 Performance + accessibility pass.** Lighthouse, pause off-screen,
  DPR caps, keyboard focus + labels, reduced-motion still frame. Blog post.

## Decisions

- Wall style: colorful climbing-gym holds using the site accents (not rock).
- Phones: lighter blob, 2D climber.
- Motion tiers: `off` (reduced motion: no 3D, no smooth scroll),
  `lite` (touch or < 768px), `full` (desktop with mouse).

## Results (PageSpeed Insights, mobile, after H.7)

Performance 85 · Accessibility 96 · Best Practices 100 · SEO 100.
H.8 fixes the two findings: the footer `> vault` link's contrast (35% → 70%
opacity, ≥ 4.5:1 in all themes) and the headline reveal delaying LCP by
~1.2 s (animation now starts at 1% opacity).
