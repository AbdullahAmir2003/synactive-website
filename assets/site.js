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

const serviceInterest = document.getElementById('service-interest');
const requestedService = new URLSearchParams(window.location.search).get('service');
if (serviceInterest && requestedService) {
    const matchingOption = Array.from(serviceInterest.options).find((option) => option.value === requestedService || option.text === requestedService);
    if (matchingOption) serviceInterest.value = matchingOption.value;
}
