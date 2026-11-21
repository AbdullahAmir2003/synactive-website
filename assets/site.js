document.documentElement.classList.add('js-ready');

document.querySelectorAll('.btn, .site-nav .nav-cta, .service-card .service-button, .service-card-new > a').forEach((action) => {
    const label = action.textContent.trim();
    if (!label) return;

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = label;

    const icon = document.createElement('span');
    icon.className = 'btn-icon';
    icon.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'svg');
    svg.setAttribute('viewBox', '0 0 1024 1024');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M779.180132 473.232045 322.354755 16.406668c-21.413706-21.413706-56.121182-21.413706-77.534887 0-21.413706 21.413706-21.413706 56.122205 0 77.534887l418.057421 418.057421L244.819868 930.057421c-21.413706 21.413706-21.413706 56.122205 0 77.534887 10.706853 10.706853 24.759917 16.059767 38.767955 16.059767s28.061103-5.353938 38.767955-16.059767L779.180132 550.767955C800.593837 529.35425 800.593837 494.64575 779.180132 473.232045z');
    svg.append(path);
    icon.append(svg);

    const overlay = document.createElement('span');
    overlay.className = 'circle-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    action.replaceChildren(text, icon, overlay);
    action.classList.add('fx-button');
});

document.querySelectorAll('.site-nav').forEach((navigation) => {
    const moveLiquid = (item) => {
        if (!item || !item.getClientRects().length) return;
        const navBounds = navigation.getBoundingClientRect();
        const itemBounds = item.getBoundingClientRect();
        navigation.style.setProperty('--liquid-x', `${itemBounds.left - navBounds.left - navigation.clientLeft}px`);
        navigation.style.setProperty('--liquid-y', `${itemBounds.top - navBounds.top - navigation.clientTop}px`);
        navigation.style.setProperty('--liquid-width', `${itemBounds.width}px`);
        navigation.style.setProperty('--liquid-height', `${itemBounds.height}px`);
    };
    const activeItem = () => navigation.querySelector(':scope > a[aria-current="page"]') || navigation.querySelector(':scope > a');
    const resetLiquid = () => moveLiquid(navigation.querySelector(':scope > a:focus-visible') || activeItem());

    navigation.addEventListener('pointerover', (event) => {
        if (!(event.target instanceof Element)) return;
        const item = event.target.closest('a');
        if (item?.parentElement === navigation) moveLiquid(item);
    });
    navigation.addEventListener('pointerleave', resetLiquid);
    navigation.addEventListener('focusin', (event) => {
        if (!(event.target instanceof Element)) return;
        const item = event.target.closest('a');
        if (item?.parentElement === navigation) moveLiquid(item);
    });
    navigation.addEventListener('focusout', () => window.requestAnimationFrame(() => {
        if (!navigation.contains(document.activeElement)) resetLiquid();
    }));

    if ('ResizeObserver' in window) {
        new ResizeObserver(resetLiquid).observe(navigation);
    } else {
        window.addEventListener('resize', resetLiquid);
    }
    resetLiquid();
});

document.querySelectorAll('.menu-toggle').forEach((button) => {
    const navigation = document.getElementById(button.getAttribute('aria-controls'));
    if (!navigation) return;

    const closeMenu = () => {
        navigation.classList.remove('is-open');
        button.setAttribute('aria-expanded', 'false');
    };

    button.addEventListener('click', () => {
        const isOpen = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!isOpen));
        navigation.classList.toggle('is-open', !isOpen);
    });

    navigation.addEventListener('click', (event) => {
        if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenu();
    });
});

const siteHeader = document.querySelector('.main-header');
if (siteHeader) {
    const navigation = siteHeader.querySelector('.site-nav');
    const setHeaderCollapsed = (collapsed) => {
        if (collapsed) {
            if (siteHeader.contains(document.activeElement)) document.activeElement.blur?.();
            navigation?.querySelectorAll('details[open]').forEach((dropdown) => { dropdown.open = false; });
        }
        siteHeader.classList.toggle('is-collapsed', collapsed);
        siteHeader.inert = collapsed;
    };

    let lastScrollY = window.scrollY;
    let scrollPending = false;
    window.addEventListener('scroll', () => {
        if (scrollPending) return;
        scrollPending = true;
        window.requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            if (currentScrollY <= siteHeader.offsetHeight) {
                setHeaderCollapsed(false);
            } else if (currentScrollY > lastScrollY + 8 && !navigation?.classList.contains('is-open')) {
                setHeaderCollapsed(true);
            } else if (currentScrollY < lastScrollY - 8) {
                setHeaderCollapsed(false);
            }
            lastScrollY = currentScrollY;
            scrollPending = false;
        });
    }, { passive: true });
}

const serviceLines = Array.from(document.querySelectorAll('.service-line-collapsible'));

const getServiceLineContent = (line) => Array.from(line.children).find((child) => child.classList.contains('service-line-content'));

const closeServiceLine = (line) => {
    const content = getServiceLineContent(line);
    if (!content || !line.open || line.dataset.closing === 'true') return;
    line.dataset.closing = 'true';
    content.style.gridTemplateRows = '1fr';
    content.style.opacity = '1';
    void content.offsetHeight;

    let timeout;
    const finish = (event) => {
        if (event && (event.target !== content || event.propertyName !== 'grid-template-rows')) return;
        window.clearTimeout(timeout);
        content.removeEventListener('transitionend', finish);
        line.open = false;
        delete line.dataset.closing;
        content.style.removeProperty('grid-template-rows');
        content.style.removeProperty('opacity');
    };

    content.addEventListener('transitionend', finish);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finish();
    } else {
        window.requestAnimationFrame(() => {
            content.style.gridTemplateRows = '0fr';
            content.style.opacity = '0';
        });
        timeout = window.setTimeout(() => finish(), 600);
    }
};

const openServiceLine = (line) => {
    const content = getServiceLineContent(line);
    if (!content || line.open || line.dataset.closing === 'true') return;
    content.style.gridTemplateRows = '0fr';
    content.style.opacity = '0';
    line.open = true;
    void content.offsetHeight;
    window.requestAnimationFrame(() => {
        content.style.removeProperty('grid-template-rows');
        content.style.removeProperty('opacity');
    });
};

const closeOtherServiceLines = (activeLine) => {
    serviceLines.forEach((line) => {
        if (line === activeLine) return;
        delete line.dataset.pinned;
        delete line.dataset.hoverOpen;
        closeServiceLine(line);
    });
};

serviceLines.forEach((line) => {
    const summary = Array.from(line.children).find((child) => child.classList.contains('service-line-summary'));
    if (!summary) return;

    line.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse' || line.open || line.dataset.closing === 'true') return;
        closeOtherServiceLines(line);
        openServiceLine(line);
        line.dataset.hoverOpen = 'true';
    });

    const closeHoverOpenLine = () => {
        if (line.dataset.hoverOpen !== 'true' || line.dataset.pinned === 'true' || line.matches(':hover') || line.contains(document.activeElement)) return;
        delete line.dataset.hoverOpen;
        closeServiceLine(line);
    };

    line.addEventListener('pointerleave', closeHoverOpenLine);
    line.addEventListener('focusout', () => window.requestAnimationFrame(closeHoverOpenLine));
    line.addEventListener('click', (event) => {
        if (!event.target.closest('.service-detail-summary')) return;
        closeOtherServiceLines(line);
        delete line.dataset.hoverOpen;
        line.dataset.pinned = 'true';
    });

    summary.addEventListener('click', (event) => {
        event.preventDefault();
        if (line.dataset.closing === 'true') return;
        if (line.dataset.hoverOpen === 'true') {
            delete line.dataset.hoverOpen;
            line.dataset.pinned = 'true';
            return;
        }
        delete line.dataset.pinned;
        if (line.open) {
            closeServiceLine(line);
        } else {
            closeOtherServiceLines(line);
            openServiceLine(line);
            line.dataset.pinned = 'true';
        }
    });
});

document.querySelectorAll('.line-card, .service-card-link, .service-card, .service-card-new, .blog-card, .service-line, .service-detail, .timeline-step, .week-pill, .about-visual, .cta-panel, .contact-form-container').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
        card.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
    });
});

const prepareServiceContent = (content) => {
    const inner = document.createElement('div');
    inner.className = 'service-detail-inner';
    while (content.firstChild) inner.append(content.firstChild);
    content.append(inner);
    content.classList.add('service-detail-animated');

    const textElements = inner.querySelectorAll('.service-detail-head p, .service-facts h4, .service-facts p, .service-facts li, .week-pill strong, .week-pill span, .note');
    textElements.forEach((element, blockIndex) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        textNodes.forEach((textNode) => {
            const parts = textNode.textContent.match(/\s+|[^\s]+/g);
            if (!parts) return;
            const fragment = document.createDocumentFragment();
            let wordIndex = 0;
            parts.forEach((part) => {
                if (/^\s+$/.test(part)) {
                    fragment.append(document.createTextNode(part));
                    return;
                }
                const word = document.createElement('span');
                word.className = 'service-word';
                word.textContent = part;
                word.style.setProperty('--reveal-delay', `${blockIndex * 42 + Math.min(wordIndex * 8, 240)}ms`);
                wordIndex += 1;
                fragment.append(word);
            });
            textNode.replaceWith(fragment);
        });
    });
};

const openServiceCard = (card) => {
    const content = card.querySelector('.service-detail-content');
    if (!content || card.open || card.dataset.closing === 'true') return;
    content.style.gridTemplateRows = '0fr';
    card.open = true;
    void content.offsetHeight;
    window.requestAnimationFrame(() => {
        content.style.removeProperty('grid-template-rows');
        content.classList.add('is-revealing');
    });
};

const closeServiceCard = (card) => {
    const content = card.querySelector('.service-detail-content');
    if (!content || !card.open || card.dataset.closing === 'true') return;
    card.dataset.closing = 'true';
    content.classList.remove('is-revealing');
    content.style.gridTemplateRows = '1fr';
    void content.offsetHeight;

    let timeout;
    const finish = (event) => {
        if (event && (event.target !== content || event.propertyName !== 'grid-template-rows')) return;
        window.clearTimeout(timeout);
        content.removeEventListener('transitionend', finish);
        card.open = false;
        delete card.dataset.closing;
        content.style.removeProperty('grid-template-rows');
    };

    content.addEventListener('transitionend', finish);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finish();
    } else {
        window.requestAnimationFrame(() => {
            content.style.gridTemplateRows = '0fr';
        });
        timeout = window.setTimeout(() => finish(), 600);
    }
};

document.querySelectorAll('.service-detail-collapsible').forEach((card) => {
    const summary = card.querySelector('.service-detail-summary');
    const content = card.querySelector('.service-detail-content');
    if (!summary || !content) return;

    prepareServiceContent(content);

    card.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse' || card.open) return;
        openServiceCard(card);
        card.dataset.hoverOpen = 'true';
    });

    const closeHoverOpen = () => {
        if (card.dataset.hoverOpen !== 'true' || card.matches(':hover') || card.contains(document.activeElement)) return;
        delete card.dataset.hoverOpen;
        closeServiceCard(card);
    };

    card.addEventListener('pointerleave', closeHoverOpen);
    card.addEventListener('focusout', () => window.requestAnimationFrame(closeHoverOpen));
    summary.addEventListener('click', (event) => {
        event.preventDefault();
        if (card.dataset.closing === 'true') return;
        if (card.dataset.hoverOpen === 'true') {
            delete card.dataset.hoverOpen;
            return;
        }
        delete card.dataset.hoverOpen;
        if (card.open) closeServiceCard(card);
        else openServiceCard(card);
    });
});

const revealTargets = document.querySelectorAll('.hero-inner > *, .page-hero-inner > *, .section-heading, .service-line-heading, .service-detail, .service-card-new, .cta-panel');
if (revealTargets.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const revealOrder = new Map();
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });

    revealTargets.forEach((target) => {
        const group = target.closest('.service-line, .section') || target.parentElement;
        const order = revealOrder.get(group) || 0;
        revealOrder.set(group, order + 1);
        target.style.setProperty('--reveal-delay', `${Math.min(order * 75, 525)}ms`);
        Array.from(target.children).forEach((child, index) => {
            child.style.setProperty('--reveal-child-delay', `${index * 65}ms`);
        });
        target.classList.add('scroll-reveal');
        revealObserver.observe(target);
    });
}

const serviceInterest = document.getElementById('service-interest');
const requestedService = new URLSearchParams(window.location.search).get('service');
if (serviceInterest && requestedService) {
    const matchingOption = Array.from(serviceInterest.options).find((option) => option.value === requestedService || option.text === requestedService);
    if (matchingOption) serviceInterest.value = matchingOption.value;
}
