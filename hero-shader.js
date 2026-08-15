/* ============================================================
   Craig Dowdall — Hero Background Shader
   Renders a live, theme-aware flow-field gradient in place of the
   static ShaderGradient GIF. Same visual family (posterized simplex
   noise bands, organic drift) but scales to any resolution, costs a
   few KB instead of 22MB, and re-tints itself for light/dark mode
   because the palette is passed in as uniforms read from CSS vars.
   ============================================================ */
(function () {
  "use strict";

  const VERTEX_SRC = `
    attribute vec2 aPosition;
    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  // Fragment shader: 3-octave simplex noise, domain-warped for organic
  // flow, then quantized into stepped bands to match the source gif's
  // posterized-contour look. Colour is mixed between three theme-aware
  // stops so it can be re-tinted per light/dark mode without recompiling.
  const FRAGMENT_SRC = `
    precision highp float;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform vec3 uColorA;   // background base
    uniform vec3 uColorB;   // mid accent-soft
    uniform vec3 uColorC;   // deep accent
    uniform float uBands;   // number of posterized steps

    // Simplex noise (Ashima Arts / Stefan Gustavson, public domain)
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187,0.366025403784439,
                          -0.577350269189626,0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
              + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    float fbm(vec2 p){
      float v = 0.0;
      float amp = 0.55;
      for (int i = 0; i < 4; i++) {
        v += amp * snoise(p);
        p *= 2.02;
        amp *= 0.55;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 aspectUv = uv;
      aspectUv.x *= uResolution.x / uResolution.y;

      float t = uTime * 0.045;

      // domain warp: feed noise through noise for organic, non-repeating flow
      vec2 warpA = vec2(fbm(aspectUv * 1.6 + vec2(t, -t * 0.7)),
                        fbm(aspectUv * 1.6 + vec2(-t * 0.6, t)));
      vec2 warped = aspectUv + warpA * 0.65;
      float n = fbm(warped * 1.35 + vec2(t * 0.5, t * 0.3));

      // normalize roughly into 0..1
      n = n * 0.5 + 0.5;

      // posterize into bands like the reference gif's stepped contours
      float banded = floor(n * uBands) / uBands;
      banded += (n - banded) * 0.18; // soften the hard edges slightly

      vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 0.55, banded));
      col = mix(col, uColorC, smoothstep(0.45, 1.0, banded));

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function hexToRgbFloat(hex) {
    const m = hex.trim().replace("#", "");
    const bigint = parseInt(m.length === 3
      ? m.split("").map((c) => c + c).join("")
      : m, 16);
    return [
      ((bigint >> 16) & 255) / 255,
      ((bigint >> 8) & 255) / 255,
      (bigint & 255) / 255
    ];
  }

  function readThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      a: hexToRgbFloat(styles.getPropertyValue("--bg").trim() || "#f3eee6"),
      b: hexToRgbFloat(styles.getPropertyValue("--accent-soft").trim() || "#d8e8e3"),
      c: hexToRgbFloat(styles.getPropertyValue("--accent").trim() || "#2e7d6e")
    };
  }

  function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Hero shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function initHeroShader(mount) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      mount.classList.add("fallback");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    mount.appendChild(canvas);

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" })
             || canvas.getContext("experimental-webgl");

    if (!gl) {
      // no WebGL support — fall back to a static CSS gradient, same
      // colour family, so the hero still looks intentional
      canvas.remove();
      mount.classList.add("fallback");
      return;
    }

    const vShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vShader || !fShader) {
      canvas.remove();
      mount.classList.add("fallback");
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("Hero shader link error:", gl.getProgramInfoLog(program));
      canvas.remove();
      mount.classList.add("fallback");
      return;
    }
    gl.useProgram(program);

    // full-screen triangle strip
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1
    ]), gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uColorA = gl.getUniformLocation(program, "uColorA");
    const uColorB = gl.getUniformLocation(program, "uColorB");
    const uColorC = gl.getUniformLocation(program, "uColorC");
    const uBands = gl.getUniformLocation(program, "uBands");

    let colors = readThemeColors();
    gl.uniform1f(uBands, 10.0);

    function applyColors() {
      colors = readThemeColors();
      gl.uniform3f(uColorA, colors.a[0], colors.a[1], colors.a[2]);
      gl.uniform3f(uColorB, colors.b[0], colors.b[1], colors.b[2]);
      gl.uniform3f(uColorC, colors.c[0], colors.c[1], colors.c[2]);
    }
    applyColors();

    // re-tint instantly when the theme toggle flips data-theme
    const themeObserver = new MutationObserver(applyColors);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let dpr = Math.min(window.devicePixelRatio || 1, 1.75); // cap DPR, this is a big canvas
    function resize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    }
    resize();

    let ro;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(resize);
      ro.observe(mount);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    // pause rendering when the hero isn't on screen (theme toggle /
    // tab switching / scrolling far past it) to save battery
    let visible = true;
    if (window.IntersectionObserver) {
      const io = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
      }, { threshold: 0 });
      io.observe(mount);
    }
    document.addEventListener("visibilitychange", () => {
      visible = visible && !document.hidden;
    });

    let start = null;
    let rafId;
    function frame(ts) {
      rafId = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      if (start === null) start = ts;
      const elapsed = (ts - start) / 1000;
      gl.uniform1f(uTime, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    rafId = requestAnimationFrame(frame);

    requestAnimationFrame(() => canvas.classList.add("loaded"));

    // expose a teardown handle in case the page ever needs to unmount this
    mount._heroShaderCleanup = () => {
      cancelAnimationFrame(rafId);
      themeObserver.disconnect();
      if (ro) ro.disconnect();
    };
  }

  window.initHeroShader = initHeroShader;
})();
