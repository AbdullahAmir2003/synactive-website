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

let activeServiceDialog = null;

const waitForCardTransition = (card) => new Promise((resolve) => {
    let finished = false;
    const finish = (event) => {
        if (event && (event.target !== card || event.propertyName !== 'height')) return;
        if (finished) return;
        finished = true;
        card.removeEventListener('transitionend', finish);
        window.clearTimeout(timeout);
        resolve();
    };

    const timeout = window.setTimeout(() => finish(), 600);
    card.addEventListener('transitionend', finish);
});

const closeServiceDialog = async () => {
    const state = activeServiceDialog;
    if (!state || state.closing) return;
    state.closing = true;
    state.dialog.classList.add('is-closing');
    state.card.classList.remove('is-fullscreen');
    await waitForCardTransition(state.card);

    state.dialog.close();
    if (state.nextSibling?.parentNode === state.parent) {
        state.parent.insertBefore(state.card, state.nextSibling);
    } else {
        state.parent.append(state.card);
    }

    state.card.classList.remove('service-detail-expanded');
    state.card.style.removeProperty('--origin-top');
    state.card.style.removeProperty('--origin-left');
    state.card.style.removeProperty('--origin-width');
    state.card.style.removeProperty('--origin-height');
    state.card.open = false;
    state.card.querySelector('.service-duration-modal')?.remove();
    state.closeButton.remove();
    if (state.previousTitleId) {
        state.title.id = state.previousTitleId;
    } else {
        state.title.removeAttribute('id');
    }
    state.dialog.remove();
    activeServiceDialog = null;
    window.scrollTo(0, state.scrollY);
    const returnFocus = state.card.contains(state.previousFocus) ? state.previousFocus : state.summary;
    window.setTimeout(() => returnFocus.focus({ preventScroll: true }), 0);
};

const openServiceDialog = (card) => {
    if (activeServiceDialog) return;
    const summary = card.querySelector('.service-detail-summary');
    const title = summary?.querySelector('h3');
    const content = card.querySelector('.service-detail-content');
    const parent = card.parentNode;
    if (!summary || !title || !content || !parent) return;

    const bounds = card.getBoundingClientRect();
    const dialog = document.createElement('dialog');
    dialog.className = 'service-detail-dialog';
    const previousTitleId = title.id;
    title.id = `${card.id}-dialog-title`;
    dialog.setAttribute('aria-labelledby', title.id);

    const closeButton = document.createElement('button');
    closeButton.className = 'service-detail-close';
    closeButton.type = 'button';
    closeButton.textContent = 'Close';
    closeButton.setAttribute('aria-label', `Close ${title.textContent.trim()} details`);

    const duration = card.querySelector('.service-duration');
    if (duration) {
        const durationBadge = duration.cloneNode(true);
        durationBadge.classList.add('service-duration-modal');
        summary.append(durationBadge);
    }

    const state = {
        card,
        closeButton,
        dialog,
        nextSibling: card.nextSibling,
        parent,
        previousFocus: document.activeElement,
        previousTitleId,
        scrollY: window.scrollY,
        summary,
        title,
        closing: false,
    };
    activeServiceDialog = state;
    closeButton.addEventListener('click', closeServiceDialog);
    dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        closeServiceDialog();
    });
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) closeServiceDialog();
    });

    delete card.dataset.hoverOpen;
    card.open = true;
    card.style.setProperty('--origin-top', `${bounds.top}px`);
    card.style.setProperty('--origin-left', `${bounds.left}px`);
    card.style.setProperty('--origin-width', `${bounds.width}px`);
    card.style.setProperty('--origin-height', `${bounds.height}px`);
    card.classList.add('service-detail-expanded');
    dialog.append(card, closeButton);
    document.body.append(dialog);
    dialog.showModal();
    void card.offsetWidth;
    window.requestAnimationFrame(() => card.classList.add('is-fullscreen'));
    closeButton.focus({ preventScroll: true });
};

document.querySelectorAll('.service-detail-collapsible').forEach((card) => {
    const summary = card.querySelector('.service-detail-summary');
    if (!summary) return;

    card.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse' || card.open || activeServiceDialog) return;
        card.open = true;
        card.dataset.hoverOpen = 'true';
    });

    const closeHoverOpen = () => {
        if (activeServiceDialog?.card === card) return;
        if (card.dataset.hoverOpen !== 'true' || card.matches(':hover') || card.contains(document.activeElement)) return;
        card.open = false;
        delete card.dataset.hoverOpen;
    };

    card.addEventListener('pointerleave', closeHoverOpen);
    card.addEventListener('focusout', () => window.requestAnimationFrame(closeHoverOpen));
    summary.addEventListener('click', (event) => {
        event.preventDefault();
        openServiceDialog(card);
    });
});

const serviceInterest = document.getElementById('service-interest');
const requestedService = new URLSearchParams(window.location.search).get('service');
if (serviceInterest && requestedService) {
    const matchingOption = Array.from(serviceInterest.options).find((option) => option.value === requestedService || option.text === requestedService);
    if (matchingOption) serviceInterest.value = matchingOption.value;
}
