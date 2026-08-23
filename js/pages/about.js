import { markContentReady } from '../common/preloader.js';

function initReveal() {
  const nodes = document.querySelectorAll(
    '.about-contacts, .about-contact-card, .about-map'
  );

  nodes.forEach((node) => {
    node.style.opacity = '0';
    node.style.transform = 'translateY(16px)';
    node.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
  });

  const reveal = (node) => {
    node.style.opacity = '1';
    node.style.transform = 'none';
  };

  if (!('IntersectionObserver' in window)) {
    nodes.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  nodes.forEach((node) => observer.observe(node));
}

markContentReady();

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  initReveal();
}
