document.addEventListener('DOMContentLoaded', () => {
    // Find all the necessary elements for the menu
    const hamburger = document.querySelector('.hamburger-menu');
    const navMenu = document.querySelector('.nav-menu');
    const overlay = document.querySelector('.overlay');

    // Ensure all elements exist before adding event listeners to prevent errors
    if (hamburger && navMenu && overlay) {
        // A single function to handle opening and closing the menu
        const toggleMenu = () => {
            hamburger.classList.toggle('open');
            navMenu.classList.toggle('open');
            overlay.classList.toggle('open');
        };

        // Add click listeners to the hamburger and the overlay
        hamburger.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    }
});