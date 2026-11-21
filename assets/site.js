document.documentElement.classList.add('js-ready');

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
    const revealButton = document.createElement('button');
    revealButton.className = 'nav-reveal-toggle';
    revealButton.type = 'button';
    revealButton.textContent = '⌄';
    revealButton.setAttribute('aria-label', 'Show navigation');
    if (!siteHeader.id) siteHeader.id = 'site-header';
    revealButton.setAttribute('aria-controls', siteHeader.id);
    revealButton.setAttribute('aria-expanded', 'false');
    revealButton.setAttribute('aria-hidden', 'true');
    revealButton.tabIndex = -1;
    document.body.append(revealButton);

    const setHeaderCollapsed = (collapsed) => {
        siteHeader.classList.toggle('is-collapsed', collapsed);
        siteHeader.inert = collapsed;
        revealButton.classList.toggle('is-visible', collapsed);
        revealButton.setAttribute('aria-expanded', String(!collapsed));
        revealButton.setAttribute('aria-hidden', String(!collapsed));
        revealButton.tabIndex = collapsed ? 0 : -1;
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
            } else if (currentScrollY > lastScrollY + 8 && !navigation?.classList.contains('is-open') && !siteHeader.contains(document.activeElement)) {
                setHeaderCollapsed(true);
            } else if (currentScrollY < lastScrollY - 8) {
                setHeaderCollapsed(false);
            }
            lastScrollY = currentScrollY;
            scrollPending = false;
        });
    }, { passive: true });

    revealButton.addEventListener('click', () => {
        setHeaderCollapsed(false);
        lastScrollY = window.scrollY;
    });
}

document.querySelectorAll('.line-card, .service-card-link, .service-card, .service-card-new, .blog-card, .service-detail, .timeline-step, .week-pill, .about-visual, .cta-panel, .contact-form-container').forEach((card) => {
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

const serviceLines = document.querySelectorAll('.service-line');
if (serviceLines.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const serviceLineObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.08 });

    serviceLines.forEach((section) => {
        section.classList.add('is-reveal-pending');
        serviceLineObserver.observe(section);
    });
}

const serviceInterest = document.getElementById('service-interest');
const requestedService = new URLSearchParams(window.location.search).get('service');
if (serviceInterest && requestedService) {
    const matchingOption = Array.from(serviceInterest.options).find((option) => option.value === requestedService || option.text === requestedService);
    if (matchingOption) serviceInterest.value = matchingOption.value;
}
