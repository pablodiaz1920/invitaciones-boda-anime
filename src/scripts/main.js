// --- Scroll Animations (Intersection Observer) ---
(function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('anim-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.anim-fade-in-up, .anim-fade-in-left, .anim-fade-in-right, .anim-scale-in').forEach(el => {
    if (!el.closest('#inicio')) observer.observe(el);
  });
})();

// --- Hero entrance on load ---
(function initHeroEntrance() {
  const heroEls = document.querySelectorAll('#inicio .anim-fade-in-up, #inicio .anim-fade-in-left, #inicio .anim-fade-in-right, #inicio .anim-scale-in');
  if (heroEls.length) {
    requestAnimationFrame(() => {
      heroEls.forEach((el, i) => {
        setTimeout(() => el.classList.add('anim-visible'), i * 120);
      });
    });
  }
})();

// --- Countdown ---
(function initCountdown() {
  const weddingDate = new Date("January 30, 2027 17:00:00").getTime();
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v < 10 ? "0" + v : v; };
  const countdown = setInterval(() => {
    const now = new Date().getTime();
    const distance = weddingDate - now;
    if (distance < 0) { clearInterval(countdown); el("days", 0); el("hours", 0); el("minutes", 0); el("seconds", 0); return; }
    el("days", Math.floor(distance / (1000 * 60 * 60 * 24)));
    el("hours", Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    el("minutes", Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)));
    el("seconds", Math.floor((distance % (1000 * 60)) / 1000));
  }, 1000);
})();

// --- Music Player ---
(function initMusic() {
  const btn = document.getElementById('music-btn');
  const icon = document.getElementById('music-icon');
  const audio = document.getElementById('bg-music');
  if (!btn || !icon || !audio) return;
  let playing = false;
  btn.addEventListener('click', () => {
    if (playing) { audio.pause(); icon.className = 'fas fa-music text-xl'; btn.classList.remove('animate-spin'); }
    else { audio.play(); icon.className = 'fas fa-pause text-xl'; btn.classList.add('animate-spin'); }
    playing = !playing;
  });
})();

// --- Smooth Scroll & Active Section ---
(function initSmoothScroll() {
  const HEADER_OFFSET = 70;

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav a[href^="#"], #mobile-menu a[href^="#"]');

  function updateActiveSection() {
    let current = '';
    const scrollPos = window.scrollY + HEADER_OFFSET + 100;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('text-wedding-rose', 'font-bold');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('text-wedding-rose', 'font-bold');
      }
    });
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { updateActiveSection(); ticking = false; });
      ticking = true;
    }
  });
  updateActiveSection();
})();

// --- Mobile Menu ---
(function initMenu() {
  const menu = document.getElementById('mobile-menu');
  const openBtn = document.getElementById('open-menu-btn');
  const closeBtn = document.getElementById('close-menu-btn');
  if (!menu || !openBtn) return;
  const toggle = () => menu.classList.toggle('translate-x-full');
  openBtn.addEventListener('click', toggle);
  if (closeBtn) closeBtn.addEventListener('click', toggle);
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', toggle));
})();

// --- Toast ---
function mostrarToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerText = msg;
  t.classList.remove('translate-x-80', 'opacity-0');
  setTimeout(() => t.classList.add('translate-x-80', 'opacity-0'), 3000);
}

// --- Copy Account ---
function copiarCuenta(numero) {
  const i = document.createElement('input');
  i.value = numero;
  document.body.appendChild(i);
  i.select();
  document.execCommand('copy');
  document.body.removeChild(i);
  mostrarToast('¡Cuenta copiada al portapapeles!');
}

// --- Copy from Input ---
function copiarAlPortapapelesId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.select();
  el.setSelectionRange(0, 99999);
  document.execCommand('copy');
  mostrarToast('¡Copiado con éxito!');
}

// --- RSVP Form ---
(function initRSVP() {
  const form = document.getElementById('rsvp-form');
  const modal = document.getElementById('rsvp-success-modal');
  if (!form || !modal) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    modal.classList.remove('hidden');
  });
})();

function reiniciarFormulario() {
  const form = document.getElementById('rsvp-form');
  const modal = document.getElementById('rsvp-success-modal');
  if (form) form.reset();
  if (modal) modal.classList.add('hidden');
}

// --- Panel Novios ---
function togglePanelNovios() {
  const panel = document.getElementById('panel-novios-section');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) panel.scrollIntoView({ behavior: 'smooth' });
}

function generarInvitacionLink() {
  const name = document.getElementById('gen-name')?.value.trim();
  const passes = document.getElementById('gen-passes')?.value;
  let baseUrl = document.getElementById('gen-base-url')?.value.trim();
  if (!name) { mostrarToast('Por favor, escribe el nombre del invitado'); return; }
  if (!baseUrl) baseUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  const generatedUrl = `${baseUrl}/?g=${encodeURIComponent(name)}&p=${passes}`;
  document.getElementById('gen-result-url').value = generatedUrl;
  const message = `✨ ¡HOLA! ${name.toUpperCase()} ✨\n\nTenemos el gran honor de invitarlos a formar parte de nuestra tripulación en la aventura más importante de nuestras vidas: ¡NUESTRA BODA! 💍☠️🍃\n\nHemos preparado una invitación web especial interactiva para ustedes, donde podrán ver la cuenta regresiva, la historia de nuestra alianza y confirmar su asistencia.\n\n👇 Entren a su pase personalizado aquí:\n${generatedUrl}\n\n¡Los esperamos en la Gran Ruta de la Vida el 30 de enero de 2027! 🌸⚔️`;
  document.getElementById('gen-result-msg').value = message;
  document.getElementById('gen-result-container').classList.remove('hidden');
  mostrarToast('¡Invitación generada exitosamente!');
}

function compartirWhatsAppDirecto() {
  const text = document.getElementById('gen-result-msg')?.value;
  if (!text) return;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

// --- URL Params (autofill RSVP name/guests) ---
(function checkURLParameters() {
  const params = new URLSearchParams(window.location.search);
  const guest = params.get('g');
  const passes = params.get('p');
  if (guest) {
    const nameInput = document.getElementById('rsvp-name');
    if (nameInput) nameInput.value = decodeURIComponent(guest);
    const guestsSelect = document.getElementById('rsvp-guests');
    if (guestsSelect && passes) guestsSelect.value = passes;
  }
})();

// --- Expose to window for onclick handlers ---
window.mostrarToast = mostrarToast;
window.copiarCuenta = copiarCuenta;
window.copiarAlPortapapelesId = copiarAlPortapapelesId;
window.reiniciarFormulario = reiniciarFormulario;
window.togglePanelNovios = togglePanelNovios;
window.generarInvitacionLink = generarInvitacionLink;
window.compartirWhatsAppDirecto = compartirWhatsAppDirecto;
