document.addEventListener('DOMContentLoaded', () => {
const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
const menuButton = document.getElementById('eesel-menu-btn');
const mobileMenu = document.getElementById('eesel-mobile-menu');
const openIcon = document.getElementById('eesel-menu-open');
const closeIcon = document.getElementById('eesel-menu-close');

menuButton?.addEventListener('click', () => {
mobileMenu?.classList.toggle('hidden');
openIcon?.classList.toggle('hidden');
closeIcon?.classList.toggle('hidden');
});

document.querySelectorAll('[data-nav-link]').forEach(link => {
const href = (link.getAttribute('href') || '').split('#')[0].toLowerCase();
const active = href === page || (page === '' && href === 'index.html');
if (!active) return;
link.classList.remove('text-slate-400');
link.classList.add('text-white', 'bg-slate-800');
});
});
