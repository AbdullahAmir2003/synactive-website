(() => {
    const visual = document.querySelector('[data-energy-ring]');
    const canvas = visual?.querySelector('canvas');
    if (!visual || !canvas) return;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
        console.error('Service energy ring could not start because Canvas 2D is unavailable.');
        return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const serviceLines = Array.from(document.querySelectorAll('.service-line-collapsible'));
    const serviceList = document.querySelector('.service-line-list');
    const colors = ['#078e82', '#20b49f', '#52d8bf', '#a7f5e5'];
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let particles = [];
    let time = 0;
    let particleTime = 0;
    let lastFrame = 0;
    let frameId = 0;
    let visible = false;
    let running = false;
    let energy = 0;
    let targetEnergy = 0;

    const makeRandom = (seed) => () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };

    const createParticles = () => {
        const random = makeRandom(1337);
        const count = Math.min(1400, Math.max(520, Math.round((width * height) / 190)));
        particles = Array.from({ length: count }, () => {
            let x;
            let y;
            let size;
            let tone;
            if (random() < 0.28) {
                const angle = random() * Math.PI * 2;
                const radius = 0.82 + random() * 0.14;
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;
                size = 1.2 + random() * 1.4;
                tone = random() < 0.48 ? 2 : 3;
            } else if (random() < 0.78) {
                y = random() * 0.95;
                const halfWidth = Math.sqrt(Math.max(0, 1 - y * y)) * 0.94;
                x = (random() * 2 - 1) * halfWidth;
                size = 1 + random() * 1.6;
                tone = random() < 0.54 ? 1 : 2;
            } else {
                const angle = random() * Math.PI * 2;
                const radius = Math.sqrt(random()) * 0.84;
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;
                size = 1 + random() * 1.2;
                tone = random() < 0.5 ? 2 : 3;
            }
            return {
                x,
                y,
                size,
                tone,
                phase: random(),
                speed: 0.3 + random() * 0.8,
                rise: 0.08 + random() * 0.16,
                drift: random() * Math.PI * 2,
            };
        });
    };

    const resize = () => {
        const bounds = visual.getBoundingClientRect();
        width = bounds.width;
        height = bounds.height;
        pixelRatio = Math.min(1.5, window.devicePixelRatio || 1);
        canvas.width = Math.max(1, Math.round(width * pixelRatio));
        canvas.height = Math.max(1, Math.round(height * pixelRatio));
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        createParticles();
        draw();
        if (!reducedMotion) start();
    };

    const drawRingPath = (cx, cy, radius, amplitude, phase) => {
        const segments = 240;
        context.beginPath();
        for (let index = 0; index <= segments; index += 1) {
            const angle = (index / segments) * Math.PI * 2;
            const wave = Math.sin(angle * 7 - time * 1.3 + phase) * 0.56
                + Math.sin(angle * 19 + time * 0.8 + phase * 1.7) * 0.28
                + Math.sin(angle * 37 - time * 0.6 + phase * 0.5) * 0.16;
            const r = radius + wave * amplitude;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        }
        context.closePath();
    };

    function draw() {
        if (width < 2 || height < 2) return;
        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) * 0.36;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);

        context.save();
        context.beginPath();
        context.arc(cx, cy, radius * 0.99, 0, Math.PI * 2);
        context.clip();
        const haze = context.createRadialGradient(cx, cy + radius * 0.62, 0, cx, cy + radius * 0.28, radius * 1.2);
        haze.addColorStop(0, 'rgba(25, 173, 151, .17)');
        haze.addColorStop(0.58, 'rgba(14, 111, 102, .09)');
        haze.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = haze;
        context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

        context.globalCompositeOperation = 'lighter';
        particles.forEach((particle) => {
            const phase = (particle.phase + particleTime * particle.speed * 0.12) % 1;
            const lift = Math.sin(phase * Math.PI) * particle.rise;
            const x = particle.x + Math.sin(particleTime * particle.speed + particle.drift) * 0.008;
            const y = particle.y - lift;
            if (x * x + y * y > 0.96) return;
            const flicker = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(particleTime * (2 + particle.speed * 3) + particle.drift));
            const alpha = flicker * (particle.tone === 3 ? 0.56 : 0.34 + energy * 0.2);
            const size = particle.size * (0.48 + 0.7 * Math.sin(phase * Math.PI));
            context.fillStyle = colors[particle.tone];
            context.globalAlpha = alpha;
            context.fillRect(cx + x * radius - size / 2, cy + y * radius - size / 2, size, size);
        });
        context.restore();

        context.save();
        context.globalCompositeOperation = 'lighter';
        context.lineCap = 'round';
        context.lineJoin = 'round';
        drawRingPath(cx, cy, radius, radius * (0.012 + energy * 0.008), 0);
        context.strokeStyle = 'rgba(7, 142, 130, .34)';
        context.lineWidth = radius * 0.12;
        context.shadowColor = '#20b49f';
        context.shadowBlur = radius * (0.22 + energy * 0.12);
        context.stroke();

        drawRingPath(cx, cy, radius, radius * 0.012, 1.2);
        context.strokeStyle = 'rgba(32, 180, 159, .42)';
        context.lineWidth = radius * 0.045;
        context.shadowBlur = radius * 0.08;
        context.stroke();

        for (let strand = 0; strand < 4; strand += 1) {
            drawRingPath(cx, cy, radius + (strand - 1.5) * radius * 0.006, radius * (0.004 + strand * 0.001), strand * 1.8);
            context.globalAlpha = 0.28 + strand * 0.12;
            context.strokeStyle = strand === 3 ? '#a7f5e5' : '#52d8bf';
            context.lineWidth = Math.max(1, radius * (strand === 3 ? 0.004 : 0.006));
            context.shadowBlur = radius * 0.035;
            context.stroke();
        }

        context.globalAlpha = 0.45 + energy * 0.3;
        context.strokeStyle = '#baf9ed';
        context.lineWidth = Math.max(1, radius * 0.0025);
        context.shadowBlur = radius * 0.045;
        context.beginPath();
        context.arc(cx, cy, radius * 1.004, -Math.PI * 0.98, -Math.PI * 0.18);
        context.stroke();

        for (let arc = 0; arc < 3; arc += 1) {
            const start = -Math.PI / 2 + time * (0.16 + arc * 0.025) + arc * 2.1;
            context.globalAlpha = 0.28 + energy * 0.32;
            context.strokeStyle = arc === 1 ? '#a7f5e5' : '#52d8bf';
            context.lineWidth = Math.max(1.5, radius * 0.009);
            context.shadowBlur = radius * 0.09;
            context.beginPath();
            context.arc(cx, cy, radius * (1.01 + arc * 0.004), start, start + 0.16 + energy * 0.12);
            context.stroke();
        }
        context.restore();
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
    }

    const render = (now) => {
        if (!running) return;
        const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
        lastFrame = now;
        energy += (targetEnergy - energy) * (1 - Math.exp(-delta * 2.5));
        time += delta * (0.6 + energy * 0.55);
        particleTime += delta * (0.45 + energy * 0.2);
        draw();
        frameId = window.requestAnimationFrame(render);
    };

    function start() {
        if (running || !visible || document.hidden || reducedMotion) return;
        running = true;
        lastFrame = performance.now();
        frameId = window.requestAnimationFrame(render);
    }

    function stop() {
        running = false;
        window.cancelAnimationFrame(frameId);
    }

    const updateEnergy = () => {
        targetEnergy = serviceLines.some((line) => line.open) ? 0.75 : 0;
    };

    serviceLines.forEach((line) => line.addEventListener('toggle', updateEnergy));
    serviceList?.addEventListener('pointerenter', () => { targetEnergy = 1; });
    serviceList?.addEventListener('pointerleave', updateEnergy);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
    });

    let resizeObserver;
    if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(visual);
    } else {
        window.addEventListener('resize', resize);
    }

    let intersectionObserver;
    if ('IntersectionObserver' in window) {
        intersectionObserver = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) start();
            else stop();
        }, { rootMargin: '100px 0px' });
        intersectionObserver.observe(visual);
    } else {
        visible = true;
        start();
    }

    resize();
    visual.classList.add('is-active');
    window.addEventListener('pagehide', () => {
        stop();
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
        window.removeEventListener('resize', resize);
    }, { once: true });
})();
