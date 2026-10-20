"use client";

/**
 * Should this device run the live 3D scenes, and is now a good time?
 *
 * Two checks, both answered only in the browser:
 *
 * 1. A real GPU. When a device has no usable GPU, browsers still offer
 *    WebGL by drawing it on the CPU ("software rendering": SwiftShader,
 *    llvmpipe…). It works, but an always-animating scene then eats the
 *    main thread. PageSpeed's test phone is exactly this case: the blob
 *    alone pushed Total Blocking Time to ~9 s. We read the GPU's name via
 *    the WEBGL_debug_renderer_info extension and skip 3D for software
 *    renderers. (If a browser hides the name, we assume real hardware.)
 *
 * 2. After the page is ready. 3D is decoration, so it waits until the
 *    page has fully loaded and the browser reports idle time
 *    (requestIdleCallback). The text, images and first paint never wait
 *    on three.js downloading or compiling shaders.
 *
 * Until both pass, scenes show their static fallbacks.
 */

import { useEffect, useState } from "react";

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

function hasHardwareWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : "";
    // Free this probe context right away; browsers cap live contexts.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !SOFTWARE_RENDERER.test(renderer);
  } catch {
    return false;
  }
}

export function use3DReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const decide = () => {
      if (!cancelled && hasHardwareWebGL()) setReady(true);
    };
    const whenIdle = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(decide, { timeout: 2500 });
      } else {
        timeoutId = setTimeout(decide, 1200); // Safari
      }
    };

    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", whenIdle);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      clearTimeout(timeoutId);
    };
  }, []);

  return ready;
}
