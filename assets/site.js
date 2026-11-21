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

document.querySelectorAll('.line-card, .service-card-link, .service-card, .service-card-new, .blog-card, .service-detail, .timeline-step, .week-pill, .about-visual, .cta-panel, .contact-form-container').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
        card.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
    });
});

document.querySelectorAll('.service-detail-collapsible').forEach((card) => {
    const summary = card.querySelector('summary');
    if (!summary) return;

    card.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse' || card.open) return;
        card.open = true;
        card.dataset.hoverOpen = 'true';
    });

    const closeHoverOpen = () => {
        if (card.dataset.hoverOpen !== 'true' || card.matches(':hover') || card.contains(document.activeElement)) return;
        card.open = false;
        delete card.dataset.hoverOpen;
    };

    card.addEventListener('pointerleave', closeHoverOpen);
    card.addEventListener('focusout', () => window.requestAnimationFrame(closeHoverOpen));
    summary.addEventListener('click', (event) => {
        if (card.dataset.hoverOpen !== 'true') return;
        event.preventDefault();
        delete card.dataset.hoverOpen;
    });
});

const serviceInterest = document.getElementById('service-interest');
const requestedService = new URLSearchParams(window.location.search).get('service');
if (serviceInterest && requestedService) {
    const matchingOption = Array.from(serviceInterest.options).find((option) => option.value === requestedService || option.text === requestedService);
    if (matchingOption) serviceInterest.value = matchingOption.value;
}
