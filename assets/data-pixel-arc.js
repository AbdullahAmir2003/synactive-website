(() => {
    const root = document.querySelector('[data-pixel-arc]');
    const section = root?.closest('.explore-section');
    const canvas = root?.querySelector('canvas');
    if (!root || !section || !canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        powerPreference: 'low-power',
    });
    if (!gl) {
        console.error('Data pixel arc could not start because WebGL is unavailable.');
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

        uniform vec2 uRes, uPtr;
        uniform float uTime, uDpr, uCell, uFill, uHover, uReach;
        uniform float uCenter, uDrop, uThick, uFall;
        uniform vec3 uBg, uBase, uAccent, uHigh;

        void main() {
            float cellSize = max(uCell, 2.0);
            vec2 cellIndex = floor(gl_FragCoord.xy / cellSize);
            vec2 cellCenter = (cellIndex + 0.5) * cellSize;
            float x = cellCenter.x / uDpr;
            float y = (uRes.y - cellCenter.y) / uDpr;
            float width = uRes.x / uDpr;
            float height = uRes.y / uDpr;

            float nx = (x / width) * 2.0 - 1.0;
            float curveY = height * uCenter + pow(abs(nx), 1.8) * (height * uDrop);
            float intensity = max(0.0, 1.0 - abs(y - curveY) / max(height * uThick, 1.0));
            float probe = (1.0 - smoothstep(0.0, 1.0, distance(vec2(x, y), uPtr) / max(uReach, 1.0))) * uHover;
            intensity = clamp(intensity + probe * 0.45, 0.0, 1.2);

            vec3 color = uBg;
            if (intensity > 0.01) {
                float waveOne = sin(nx * 4.0 - uTime * 1.5) * 0.1;
                float waveTwo = cos(y * 0.01 + uTime) * 0.1;
                intensity = clamp(intensity + waveOne + waveTwo, 0.0, 1.0);
                intensity *= max(0.0, 1.0 - pow(abs(nx), uFall));

                if (intensity > 0.02) {
                    float side = cellSize * uFill;
                    vec2 distanceFromCenter = abs(gl_FragCoord.xy - cellCenter);
                    float coverage = 1.0 - smoothstep(side * 0.5 - 1.0, side * 0.5 + 1.0, max(distanceFromCenter.x, distanceFromCenter.y));
                    float core = intensity * intensity * intensity;
                    float mid = pow(intensity, 1.5);
                    vec3 ink = uBase * intensity * 0.35 + uAccent * mid * 0.95 + uHigh * core * 0.35;
                    color = mix(uBg, clamp(ink, 0.0, 1.0), coverage * intensity);
                }
            }
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const compileShader = (type, source) => {
        const shader = gl.createShader(type);
        if (!shader) {
            console.error('Data pixel arc could not create a WebGL shader.');
            return null;
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Data pixel arc shader compilation failed:', gl.getShaderInfoLog(shader));
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
        console.error('Data pixel arc could not create a WebGL program.');
        return;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Data pixel arc program linking failed:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
        console.error('Data pixel arc could not create a WebGL buffer.');
        gl.deleteProgram(program);
        return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name) => gl.getUniformLocation(program, name);
    const uniforms = {
        resolution: uniform('uRes'),
        pointer: uniform('uPtr'),
        time: uniform('uTime'),
        dpr: uniform('uDpr'),
        cell: uniform('uCell'),
        fill: uniform('uFill'),
        hover: uniform('uHover'),
        reach: uniform('uReach'),
        center: uniform('uCenter'),
        drop: uniform('uDrop'),
        thickness: uniform('uThick'),
        falloff: uniform('uFall'),
        background: uniform('uBg'),
        base: uniform('uBase'),
        accent: uniform('uAccent'),
        highlight: uniform('uHigh'),
    };

    const pointer = { x: -1, y: -1, targetX: -1, targetY: -1 };
    let clock = 0;
    let lastFrame = 0;
    let frameId = 0;
    let isRunning = false;
    let isVisible = true;

    const resize = () => {
        const bounds = root.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        const width = Math.max(1, Math.round(bounds.width * pixelRatio));
        const height = Math.max(1, Math.round(bounds.height * pixelRatio));
        if (canvas.width === width && canvas.height === height) return;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
    };

    const render = (now) => {
        if (!isRunning) return;
        const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
        lastFrame = now;
        clock = (clock + dt * 0.72) % 6283;
        const follow = 1 - Math.exp(-dt * 9);
        pointer.x += (pointer.targetX - pointer.x) * follow;
        pointer.y += (pointer.targetY - pointer.y) * follow;

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        const width = canvas.width;
        const height = canvas.height;
        const cellPitch = Math.min(width, height) / pixelRatio / 90;

        gl.uniform2f(uniforms.resolution, width, height);
        gl.uniform2f(uniforms.pointer, pointer.x * (width / pixelRatio), pointer.y * (height / pixelRatio));
        gl.uniform1f(uniforms.time, clock);
        gl.uniform1f(uniforms.dpr, pixelRatio);
        gl.uniform1f(uniforms.cell, Math.max(2, cellPitch * pixelRatio));
        gl.uniform1f(uniforms.fill, 0.69);
        gl.uniform1f(uniforms.hover, 0.52);
        gl.uniform1f(uniforms.reach, Math.min(width, height) / pixelRatio * 0.28);
        gl.uniform1f(uniforms.center, 0.68);
        gl.uniform1f(uniforms.drop, 0.2);
        gl.uniform1f(uniforms.thickness, 0.42);
        gl.uniform1f(uniforms.falloff, 6);
        gl.uniform3f(uniforms.background, 0, 0, 0);
        gl.uniform3f(uniforms.base, 8 / 255, 76 / 255, 69 / 255);
        gl.uniform3f(uniforms.accent, 38 / 255, 183 / 255, 160 / 255);
        gl.uniform3f(uniforms.highlight, 185 / 255, 1, 239 / 255);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        frameId = window.requestAnimationFrame(render);
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
        if (!bounds.width || !bounds.height) return;
        pointer.targetX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        pointer.targetY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    };
    const clearPointer = () => {
        pointer.targetX = -1;
        pointer.targetY = -1;
    };

    section.addEventListener('pointerenter', updatePointer);
    section.addEventListener('pointermove', updatePointer);
    section.addEventListener('pointerleave', clearPointer);
    gl.clearColor(0, 0, 0, 1);
    resize();
    root.classList.add('is-active');
    canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        stop();
        root.classList.remove('is-active');
        console.error('Data pixel arc stopped because the WebGL context was lost.');
    });

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
