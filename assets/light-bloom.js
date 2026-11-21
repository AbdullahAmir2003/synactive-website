(() => {
    const root = document.querySelector('[data-light-bloom]');
    const section = root?.closest('.explore-section');
    const canvas = root?.querySelector('canvas');
    if (!root || !section || !canvas) return;

    const gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        powerPreference: 'low-power',
    });
    if (!gl) {
        console.error('Light Bloom could not start because WebGL is unavailable.');
        return;
    }

    const vertexSource = `
        attribute vec2 a_pos;
        void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;
    const fragmentSource = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif

        uniform vec2 uRes;
        uniform float uTime;
        uniform vec3 uBg;
        uniform vec3 uBase;
        uniform vec3 uAccent;
        uniform float uRise;
        uniform float uSpread;
        uniform float uOriginX;
        uniform float uLift;
        uniform float uShaftCount;
        uniform float uShaftAmount;
        uniform float uShaftDrift;
        uniform float uGrain;
        uniform float uVignette;

        float h11(float x) { return fract(sin(x * 127.1) * 43758.5453123); }

        float vn1(float x) {
            float i = floor(x);
            float f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            return mix(h11(i), h11(i + 1.0), f);
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / uRes;
            float aspect = uRes.x / uRes.y;
            float breathe = 1.0 + 0.06 * sin(uTime * 0.35);
            float depth = mix(0.05, 1.20, uSpread);
            vec2 origin = vec2(uOriginX, -depth);
            float edgeCoord = uv.y;
            vec2 q = vec2((uv.x - origin.x) * aspect, uv.y - origin.y);
            float d = length(q);
            float k = mix(9.0, 1.4, uRise) / breathe;
            float glow = clamp(exp(-d * k) / max(exp(-depth * k), 1e-4), 0.0, 1.0);

            float shaftX = uv.x * uShaftCount;
            float drift = uTime * uShaftDrift;
            float shaft = vn1(shaftX + drift) * 0.6 + vn1(shaftX * 2.17 - drift * 0.8) * 0.4;
            float mask = smoothstep(0.0, 0.35, edgeCoord);
            glow *= mix(1.0, 0.45 + 1.25 * shaft, uShaftAmount * mask);
            glow = clamp(glow * (1.0 + uLift * 0.25), 0.0, 1.0);

            vec3 color = mix(uBg, uBase, smoothstep(0.0, 0.68, glow));
            color = mix(color, uAccent, smoothstep(0.58, 0.99, glow));
            vec2 center = uv - 0.5;
            center.x *= aspect;
            color *= 1.0 - uVignette * smoothstep(0.35, 0.95, length(center));

            float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
            color += (noise - 0.5) * (uGrain * 0.06 + 1.5 / 255.0);
            gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
        }
    `;

    const compileShader = (type, source) => {
        const shader = gl.createShader(type);
        if (!shader) {
            console.error('Light Bloom could not create a WebGL shader.');
            return null;
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Light Bloom shader compilation failed:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) {
        console.error('Light Bloom could not create a WebGL program.');
        return;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Light Bloom program linking failed:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
        console.error('Light Bloom could not create a WebGL buffer.');
        gl.deleteProgram(program);
        return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const getUniform = (name) => gl.getUniformLocation(program, name);
    const uniforms = {
        resolution: getUniform('uRes'),
        time: getUniform('uTime'),
        background: getUniform('uBg'),
        base: getUniform('uBase'),
        accent: getUniform('uAccent'),
        rise: getUniform('uRise'),
        spread: getUniform('uSpread'),
        originX: getUniform('uOriginX'),
        lift: getUniform('uLift'),
        shaftCount: getUniform('uShaftCount'),
        shaftAmount: getUniform('uShaftAmount'),
        shaftDrift: getUniform('uShaftDrift'),
        grain: getUniform('uGrain'),
        vignette: getUniform('uVignette'),
    };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: 0.5, targetX: 0.5, active: 0, targetActive: 0 };
    let clock = 0;
    let lastFrame = 0;
    let frameId = 0;
    let isRunning = false;
    let isVisible = true;

    const resize = () => {
        const bounds = root.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(bounds.width * ratio));
        const height = Math.max(1, Math.round(bounds.height * ratio));
        if (canvas.width === width && canvas.height === height) return;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
    };

    const render = (now) => {
        if (!isRunning) return;
        const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
        lastFrame = now;
        clock = (clock + dt * 2) % 3600;

        const followX = 1 - Math.exp(-8 * dt);
        const followActive = 1 - Math.exp(-5 * dt);
        pointer.x += (pointer.targetX - pointer.x) * followX;
        pointer.active += (pointer.targetActive - pointer.active) * followActive;

        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
        gl.uniform1f(uniforms.time, clock);
        gl.uniform3f(uniforms.background, 0, 0, 0);
        gl.uniform3f(uniforms.base, 8 / 255, 92 / 255, 82 / 255);
        gl.uniform3f(uniforms.accent, 82 / 255, 216 / 255, 191 / 255);
        gl.uniform1f(uniforms.rise, 0.79);
        gl.uniform1f(uniforms.spread, 0.72);
        gl.uniform1f(uniforms.originX, 0.5 + (pointer.x - 0.5) * 0.8 * pointer.active);
        gl.uniform1f(uniforms.lift, pointer.active);
        gl.uniform1f(uniforms.shaftCount, 17);
        gl.uniform1f(uniforms.shaftAmount, 0.7);
        gl.uniform1f(uniforms.shaftDrift, 0.79);
        gl.uniform1f(uniforms.grain, 0.12);
        gl.uniform1f(uniforms.vignette, 0.25);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        if (!reducedMotion) frameId = window.requestAnimationFrame(render);
    };

    const start = () => {
        if (isRunning || !isVisible || document.hidden) return;
        isRunning = true;
        lastFrame = performance.now();
        frameId = window.requestAnimationFrame(render);
    };
    const stop = () => {
        isRunning = false;
        window.cancelAnimationFrame(frameId);
    };
    const updatePointer = (event) => {
        const bounds = section.getBoundingClientRect();
        if (!bounds.width) return;
        pointer.targetX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    };

    section.addEventListener('pointerenter', (event) => {
        pointer.targetActive = 1;
        updatePointer(event);
    });
    section.addEventListener('pointermove', updatePointer);
    section.addEventListener('pointerleave', () => { pointer.targetActive = 0; });
    canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        stop();
        root.classList.remove('is-active');
        console.error('Light Bloom stopped because the WebGL context was lost.');
    });

    gl.clearColor(0, 0, 0, 1);
    resize();
    root.classList.add('is-active');

    let resizeObserver;
    if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(root);
    } else {
        window.addEventListener('resize', resize);
    }

    let intersectionObserver;
    if ('IntersectionObserver' in window) {
        intersectionObserver = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible) start();
            else stop();
        });
        intersectionObserver.observe(section);
    } else {
        start();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
    });
    window.addEventListener('pagehide', () => {
        stop();
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
    }, { once: true });
})();
