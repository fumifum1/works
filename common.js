document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const navMenu = document.getElementById('globalNav');
    const overlay = document.querySelector('.overlay');

    if (hamburgerMenu && navMenu && overlay) {
        const toggleMenu = () => {
            // common.cssで定義されている 'open' クラスを付け外しします
            hamburgerMenu.classList.toggle('open');
            navMenu.classList.toggle('open');
            overlay.classList.toggle('open');
        };

        hamburgerMenu.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu); // メニュー外の黒い背景をクリックしても閉じます
    }
});