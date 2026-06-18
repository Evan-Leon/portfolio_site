// ============================================
// STARFIELD GENERATOR
// ============================================
function createStarfield() {
  const container = document.querySelector('.starfield');
  if (!container) return;

  const starCount = 40;

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.classList.add('star');

    const size = Math.random() * 2 + 1;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.setProperty('--twinkle-duration', `${Math.random() * 3 + 2}s`);
    star.style.setProperty('--drift-duration', `${Math.random() * 4 + 4}s`);
    star.style.setProperty('--star-delay', `${Math.random() * 5}s`);

    // Occasional colored stars
    if (Math.random() > 0.8) {
      const colors = ['#a78bfa', '#60a5fa', '#c084fc'];
      star.style.background = colors[Math.floor(Math.random() * colors.length)];
    }

    container.appendChild(star);
  }
}

// ============================================
// SCROLL FADE-IN
// ============================================
function initFadeIn() {
  const elements = document.querySelectorAll('.fade-in');
  if (!elements.length) return;

  // Feature check: fall back to making all elements visible if IntersectionObserver not available
  if (!('IntersectionObserver' in window)) {
    document.body.classList.add('js-ready');
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // Gate CSS animations — content is visible until this class is added
  document.body.classList.add('js-ready');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  elements.forEach((el) => observer.observe(el));
}

// ============================================
// MOBILE MENU
// ============================================
function initMobileMenu() {
  const button = document.querySelector('.nav__hamburger');
  const menu = document.querySelector('.nav__mobile-menu');
  if (!button || !menu) return;

  // Defensive initialization
  button.setAttribute('aria-expanded', 'false');

  button.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close menu when a link is clicked
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
    });
  });

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      menu.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    }
  });
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  createStarfield();
  initFadeIn();
  initMobileMenu();
});
