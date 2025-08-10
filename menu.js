// --- Hamburger Menu Logic (Common) ---
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const globalNav = document.getElementById('globalNav');
    const navOverlay = document.getElementById('navOverlay');

    if (!hamburgerMenu || !globalNav || !navOverlay) return;

    const closeMenu = () => {
        document.body.classList.remove('menu-open');
        hamburgerMenu.classList.remove('is-active');
        globalNav.classList.remove('is-visible');
        navOverlay.classList.remove('is-visible');
    };

    hamburgerMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = hamburgerMenu.classList.contains('is-active');
        if (isActive) {
            closeMenu();
        } else {
            document.body.classList.add('menu-open');
            hamburgerMenu.classList.add('is-active');
            globalNav.classList.add('is-visible');
            navOverlay.classList.add('is-visible');
        }
    });

    navOverlay.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && hamburgerMenu.classList.contains('is-active')) {
            closeMenu();
        }
    });
});