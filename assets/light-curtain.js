(() => {
    const root = document.querySelector('[data-light-curtain]');
    const hero = root?.closest('.hero');
    const canvas = root?.querySelector('canvas');
    if (!root || !hero || !canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        powerPreference: 'low-power',
    });
    if (!gl) {
        console.error('Light curtain could not start because WebGL is unavailable.');
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

        const int TRAIL = 8;
        const int PULSES = 3;

        uniform vec2 uRes;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uHover;
        uniform float uReach;
        uniform float uSway;
        uniform float uRush;
        uniform vec3 uTrail[TRAIL];
        uniform vec3 uPulse[PULSES];
        uniform vec3 uBg;
        uniform vec3 uBase;
        uniform vec3 uAccent;
        uniform vec3 uHigh;
        uniform float uDensity;
        uniform float uWidth;
        uniform float uSpread;
        uniform float uStriation;

        float sat(float x) { return clamp(x, 0.0, 1.0); }

        float h21(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 34.56);
            return fract(p.x * p.y);
        }

        float vnoise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = h21(i), b = h21(i + vec2(1.0, 0.0));
            float c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm5(vec2 p) {
            float sum = 0.0, amplitude = 0.5;
            for (int i = 0; i < 5; i++) {
                sum += amplitude * vnoise(p);
                p = p * 2.03 + vec2(1.7, 9.2);
                amplitude *= 0.5;
            }
            return sum;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / uRes;
            float reach = max(uReach, 0.02);
            float reachSquared = reach * reach;
            float lift = 0.0, blob = 0.0, centerY = 0.0, centerWeight = 0.0;

            for (int i = 0; i < TRAIL; i++) {
                vec3 samplePoint = uTrail[i];
                float dx = uv.x - samplePoint.x;
                float dy = uv.y - samplePoint.y;
                float gx = samplePoint.z * exp(-(dx * dx) / reachSquared);
                lift += gx;
                blob += gx * exp(-(dy * dy) / (reachSquared * 2.6));
                centerY += gx * samplePoint.y;
                centerWeight += gx;
            }
            float trailY = centerY / max(centerWeight, 1e-4);

            float ring = 0.0;
            for (int i = 0; i < PULSES; i++) {
                vec3 pulse = uPulse[i];
                float distance = abs(uv.x - pulse.x) - pulse.y;
                ring += pulse.z * exp(-(distance * distance) / 0.0012);
            }

            lift = (min(lift, 2.0) + ring * 0.9) * uHover;
            blob = min(blob, 1.5) * uHover;
            float nearPointer = exp(-pow(uv.x - uMouse.x, 2.0) / (reachSquared * 4.0));
            float warpedX = uv.x - uSway * 0.09 * (0.25 + 0.75 * nearPointer) * uHover;

            float n1 = fbm5(vec2(warpedX * 6.5 * uDensity, uTime * 0.045));
            float n2 = fbm5(vec2(warpedX * 24.0 * uDensity + 3.1, uTime * 0.075));
            float n3 = vnoise(vec2(warpedX * 210.0 * uDensity, uTime * 0.04));
            float n4 = vnoise(vec2(warpedX * 70.0 * uDensity, 4.0 + uTime * 0.03));

            float band = pow(sat(n1 * 1.30 + n2 * 0.80 - 0.58 + lift * 0.34), 1.95);
            band *= 0.62 + 0.70 * n4;
            float center = 0.50 + 0.24 * uSpread * (fbm5(vec2(warpedX * 3.1, 11.0)) - 0.5) * 2.0;
            center = mix(center, trailY, sat(centerWeight * 1.1) * uHover * 0.45);
            float width = uWidth * (0.22 + 0.28 * n2 + 0.10 * n1) * (1.0 + 0.5 * uRush * sat(lift));
            float profile = exp(-pow(abs(uv.y - center) / max(width, 0.02), 1.75));
            float intensity = band * profile * (1.0 - uStriation * 0.5 + uStriation * n3);

            float blend = sat(n1 * 1.30 - n2 * 0.55 + 0.28);
            vec3 color = mix(uBase, uAccent, blend);
            float highlight = sat((n2 - 0.70) * 5.2) * sat(n1 * 1.6 - 0.35);
            color = mix(color, uHigh, highlight * 0.85);

            vec3 outputColor = uBg;
            outputColor += color * pow(intensity, 0.88) * 1.42;
            outputColor += vec3(1.0, 0.97, 0.96) * pow(intensity, 4.5) * 0.65;
            outputColor += color * 0.30 * pow(sat(profile * band * 3.0), 0.70);
            outputColor += color * 0.10 * pow(sat(profile * 1.2), 1.3);
            outputColor += mix(uAccent, uHigh, sat(uRush)) * blob * (0.22 + 0.16 * uRush);
            outputColor += mix(uAccent, uHigh, 0.35) * ring * profile * 0.75 * uHover;
            outputColor += vec3(1.0, 0.98, 0.96) * pow(ring, 3.0) * profile * 0.35 * uHover;
            gl_FragColor = vec4(clamp(outputColor, 0.0, 1.0), 1.0);
        }
    `;

    const compileShader = (type, source) => {
        const shader = gl.createShader(type);
        if (!shader) {
            console.error('Light curtain could not create a WebGL shader.');
            return null;
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Light curtain shader compilation failed:', gl.getShaderInfoLog(shader));
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
        console.error('Light curtain could not create a WebGL program.');
        return;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Light curtain program linking failed:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
        console.error('Light curtain could not create a WebGL buffer.');
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
        time: uniform('uTime'),
        mouse: uniform('uMouse'),
        hover: uniform('uHover'),
        reach: uniform('uReach'),
        sway: uniform('uSway'),
        rush: uniform('uRush'),
        trail: uniform('uTrail[0]'),
        pulse: uniform('uPulse[0]'),
        background: uniform('uBg'),
        base: uniform('uBase'),
        accent: uniform('uAccent'),
        highlight: uniform('uHigh'),
        density: uniform('uDensity'),
        width: uniform('uWidth'),
        spread: uniform('uSpread'),
        striation: uniform('uStriation'),
    };

    const trailCount = 8;
    const historyCount = trailCount - 1;
    const pulseCount = 3;
    const trailLife = 0.62;
    const pulseLife = 1.15;
    const trailX = new Float32Array(historyCount);
    const trailY = new Float32Array(historyCount);
    const trailAge = new Float32Array(historyCount).fill(trailLife * 2);
    const trailData = new Float32Array(trailCount * 3);
    const pulseX = new Float32Array(pulseCount);
    const pulseAge = new Float32Array(pulseCount).fill(pulseLife * 2);
    const pulseData = new Float32Array(pulseCount * 3);
    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, strength: 0, targetStrength: 0 };
    const sway = { position: 0.5, velocity: 0 };

    let trailHead = 0;
    let pulseHead = 0;
    let lastTrailX = 0.5;
    let lastTrailY = 0.5;
    let previousX = 0.5;
    let previousY = 0.5;
    let rush = 0;
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

    const setColor = (location, red, green, blue) => gl.uniform3f(location, red / 255, green / 255, blue / 255);
    const render = (now) => {
        if (!isRunning) return;
        const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
        lastFrame = now;
        clock = (clock + dt * 0.55) % 3600;

        const fadeRate = 1 - Math.exp(-6 * dt);
        pointer.strength += (pointer.targetStrength - pointer.strength) * fadeRate;
        const headRate = 1 - Math.exp(-22 * dt);
        pointer.x += (pointer.targetX - pointer.x) * headRate;
        pointer.y += (pointer.targetY - pointer.y) * headRate;

        const instantSpeed = Math.hypot(pointer.targetX - previousX, pointer.targetY - previousY) / Math.max(dt, 1e-3);
        previousX = pointer.targetX;
        previousY = pointer.targetY;
        const rushTarget = Math.min(1, instantSpeed / 2) * pointer.strength;
        rush += (rushTarget - rush) * (1 - Math.exp(-(rushTarget > rush ? 14 : 3.2) * dt));

        sway.velocity += (-2 * 0.3 * 9.5 * sway.velocity - 9.5 * 9.5 * (sway.position - pointer.x)) * dt;
        sway.position += sway.velocity * dt;
        const swayAmount = Math.max(-1, Math.min(1, (pointer.x - sway.position) * 3));
        const pointerY = 1 - pointer.y;

        if (pointer.strength > 0.02 && Math.hypot(pointer.x - lastTrailX, pointerY - lastTrailY) > 0.022) {
            trailHead = (trailHead + 1) % historyCount;
            trailX[trailHead] = pointer.x;
            trailY[trailHead] = pointerY;
            trailAge[trailHead] = 0;
            lastTrailX = pointer.x;
            lastTrailY = pointerY;
        }

        trailData[0] = pointer.x;
        trailData[1] = pointerY;
        trailData[2] = pointer.strength;
        for (let index = 0; index < historyCount; index += 1) {
            const record = (trailHead - index + historyCount * 2) % historyCount;
            trailAge[record] += dt;
            const age = trailAge[record];
            const weight = age >= trailLife ? 0 : Math.pow(1 - age / trailLife, 1.6) * pointer.strength * 0.8;
            const offset = (index + 1) * 3;
            trailData[offset] = trailX[record];
            trailData[offset + 1] = trailY[record];
            trailData[offset + 2] = weight;
        }

        for (let index = 0; index < pulseCount; index += 1) {
            pulseAge[index] += dt;
            const age = pulseAge[index];
            const weight = age >= pulseLife ? 0 : Math.pow(1 - age / pulseLife, 2);
            const offset = index * 3;
            pulseData[offset] = pulseX[index];
            pulseData[offset + 1] = age * 1.05;
            pulseData[offset + 2] = weight;
        }

        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
        gl.uniform1f(uniforms.time, clock);
        gl.uniform2f(uniforms.mouse, pointer.x, pointerY);
        gl.uniform1f(uniforms.hover, pointer.strength);
        gl.uniform1f(uniforms.reach, 0.074);
        gl.uniform1f(uniforms.sway, swayAmount);
        gl.uniform1f(uniforms.rush, rush);
        gl.uniform3fv(uniforms.trail, trailData);
        gl.uniform3fv(uniforms.pulse, pulseData);
        setColor(uniforms.background, 0, 0, 0);
        setColor(uniforms.base, 8, 76, 69);
        setColor(uniforms.accent, 38, 183, 160);
        setColor(uniforms.highlight, 185, 255, 239);
        gl.uniform1f(uniforms.density, 2.2);
        gl.uniform1f(uniforms.width, 0.3);
        gl.uniform1f(uniforms.spread, 0);
        gl.uniform1f(uniforms.striation, 1);
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
        const bounds = hero.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        pointer.targetX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        pointer.targetY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
        if (pointer.strength < 0.02) {
            pointer.x = pointer.targetX;
            pointer.y = pointer.targetY;
            sway.position = pointer.targetX;
            sway.velocity = 0;
            previousX = pointer.targetX;
            previousY = pointer.targetY;
            lastTrailX = pointer.targetX;
            lastTrailY = 1 - pointer.targetY;
            trailAge.fill(trailLife * 2);
        }
        pointer.targetStrength = 1;
    };

    hero.addEventListener('pointerenter', updatePointer);
    hero.addEventListener('pointermove', updatePointer);
    hero.addEventListener('pointerleave', () => { pointer.targetStrength = 0; });
    hero.addEventListener('pointerdown', (event) => {
        updatePointer(event);
        pulseHead = (pulseHead + 1) % pulseCount;
        pulseX[pulseHead] = pointer.targetX;
        pulseAge[pulseHead] = 0;
    });

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    resize();
    hero.classList.add('has-light-curtain');
    canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        stop();
        hero.classList.remove('has-light-curtain');
        console.error('Light curtain stopped because the WebGL context was lost.');
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
        intersectionObserver.observe(hero);
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
