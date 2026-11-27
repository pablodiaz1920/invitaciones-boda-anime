import { supabase } from '../lib/supabase.js';

// --- Guest Session State ---
let guestToken = null;
let guestData = null;

// --- Scroll Animations ---
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
  // Inicio de la ceremonia, 4:00 PM hora de República Dominicana (UTC-4),
  // igual para todos sin importar dónde abran la página
  const weddingDate = new Date("2027-01-30T16:00:00-04:00").getTime();
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

// --- Scroll suave, sección activa en el menú y botón "volver arriba" ---
(function initNavigation() {
  const header = document.getElementById('site-header');
  const headerOffset = () => (header?.offsetHeight || 64) + 8;

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = href === '#inicio' ? 0 : target.getBoundingClientRect().top + window.scrollY - headerOffset();
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  const sections = [...document.querySelectorAll('section[id]')];
  const navLinks = [...document.querySelectorAll('.nav-link[data-sections]')];
  const backToTop = document.getElementById('back-to-top');

  function update() {
    const pos = window.scrollY + headerOffset() + 80;
    let current = '';
    for (const s of sections) {
      if (pos >= s.offsetTop && pos < s.offsetTop + s.offsetHeight) current = s.id;
    }
    navLinks.forEach(link => {
      const active = link.dataset.sections.split(' ').includes(current);
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    backToTop?.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.8);
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(() => { update(); ticking = false; }); ticking = true; }
  }, { passive: true });
  update();

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector('#site-header a')?.focus({ preventScroll: true });
  });
})();

// --- Menú móvil (desplegable bajo la cabecera) ---
(function initMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn = document.getElementById('menu-toggle');
  if (!menu || !btn) return;
  const icon = btn.querySelector('i');

  const setOpen = (open) => {
    menu.classList.toggle('hidden', !open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if (icon) icon.className = open ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  };

  btn.addEventListener('click', () => setOpen(menu.classList.contains('hidden')));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', e => {
    if (!menu.classList.contains('hidden') && !e.target.closest('#site-header')) setOpen(false);
  });
  window.matchMedia('(min-width: 768px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
})();

// --- Toast ---
let toastTimer;
function mostrarToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('opacity-0', '-translate-y-4');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('opacity-0', '-translate-y-4'), 3000);
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

// --- Helpers ---
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}
const $ = (id) => document.getElementById(id);
const show = (el, visible = true) => el?.classList.toggle('hidden', !visible);

// Mensajes legibles para los errores que lanza submit_rsvp en Supabase
const RSVP_ERRORS = {
  RSVP_CLOSED: 'El plazo para confirmar ya cerró. Escríbenos directamente si necesitas cambiar algo.',
  INVALID_TOKEN: 'No encontramos tu invitación. Revisa que el link esté completo.',
  INVALID_ATTENDING: 'Elige cuántas personas asistirán.',
  INVALID_STATUS: 'Elige si asistirás o no.',
};

// --- Guest Session: carga la invitación desde ?token= ---
(function initGuestSession() {
  const token = new URLSearchParams(window.location.search).get('token');
  if (!token) return; // se queda el aviso de "usa tu link personal"
  guestToken = token.trim();
  loadInvitation();
})();

async function loadInvitation() {
  show($('rsvp-no-token'), false);
  show($('rsvp-loading'));
  try {
    const { data, error } = await supabase.rpc('get_invitation', { p_token: guestToken });
    if (error) throw error;
    const invitation = Array.isArray(data) ? data[0] : data;
    if (!invitation) {
      showInvalidToken();
      return;
    }
    guestData = invitation;
    showBanner(invitation);
    if (invitation.rsvp_status) showConfirmedView();
    else showForm();
  } catch (err) {
    console.error('Error al cargar invitación:', err);
    showInvalidToken('No pudimos cargar tu invitación', 'Hubo un problema de conexión. Recarga la página para intentarlo de nuevo.');
  } finally {
    show($('rsvp-loading'), false);
  }
}

function isRsvpOpen() {
  return !guestData?.deadline || Date.now() < new Date(guestData.deadline).getTime();
}

function showInvalidToken(
  title = 'No encontramos tu invitación',
  text = 'Revisa que el link que te enviamos esté completo o escríbenos para que te lo enviemos de nuevo.'
) {
  $('rsvp-no-token-title').textContent = title;
  $('rsvp-no-token-text').textContent = text;
  show($('rsvp-no-token'));
}

function showBanner(inv) {
  const banner = $('personalized-banner');
  const text = $('personalized-text');
  const cta = $('personalized-cta');
  if (!banner || !text) return;
  const passes = Number(inv.passes);
  text.innerHTML = `¡Hola, <strong>${escHtml(inv.name)}</strong>! Hemos reservado <strong>${passes} ${passes === 1 ? 'pase' : 'pases'}</strong> para ti en nuestra Gran Alianza.`;
  if (cta) cta.textContent = inv.rsvp_status ? 'Ver mi respuesta' : 'Confirmar Ahora';
  show(banner);
}

// --- Formulario ---
function showForm() {
  const form = $('rsvp-form');
  if (!form || !guestData) return;

  if (!isRsvpOpen()) {
    showInvalidToken('El plazo para confirmar cerró', 'Si aún no nos has confirmado, escríbenos directamente. ¡Gracias!');
    return;
  }

  const passes = Number(guestData.passes) || 1;
  $('rsvp-name').textContent = guestData.name;
  $('rsvp-passes-label').textContent = ` · ${passes} ${passes === 1 ? 'pase' : 'pases'}`;

  const attending = $('rsvp-attending');
  attending.innerHTML = '';
  for (let i = passes; i >= 1; i--) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = i === 1 ? '1 persona' : `${i} personas`;
    attending.appendChild(opt);
  }
  attending.value = String(guestData.attending > 0 ? guestData.attending : passes);

  form.querySelectorAll('input[name="rsvp-status"]').forEach(r => { r.checked = r.value === guestData.rsvp_status; });
  $('rsvp-food').value = guestData.food_restrictions || '';
  $('rsvp-song').value = guestData.song || '';
  $('rsvp-message').value = guestData.message || '';
  updateConditionalFields();

  show($('rsvp-cancel-btn'), Boolean(guestData.rsvp_status));
  show($('rsvp-error'), false);
  show($('rsvp-confirmed'), false);
  show(form);
}

function selectedStatus() {
  return document.querySelector('input[name="rsvp-status"]:checked')?.value || null;
}

function updateConditionalFields() {
  show($('rsvp-yes-fields'), selectedStatus() === 'yes');
}

// --- Vista de respuesta registrada ---
function showConfirmedView(justSubmitted = false) {
  const data = guestData;
  if (!data) return;
  const going = data.rsvp_status === 'yes';

  $('rsvp-confirmed-title').textContent = justSubmitted
    ? (going ? '¡Misión Registrada Exitosamente!' : '¡Gracias por avisarnos!')
    : (going ? '¡Ya confirmaste tu asistencia!' : 'Ya registramos tu respuesta');

  const icon = $('rsvp-confirmed-icon');
  icon.className = `w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-md mx-auto ${going ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-500'}`;
  icon.innerHTML = going ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-heart"></i>';

  const row = (label, value) =>
    `<div class="flex justify-between gap-4"><span class="font-semibold text-stone-500">${label}:</span><span class="text-right">${escHtml(value)}</span></div>`;

  let html = row('Invitado', data.name);
  html += row('Respuesta', going ? '¡Sí asistiré! 🎉' : 'No podré asistir 😢');
  if (going) {
    html += row('Personas', `${data.attending} de ${data.passes}`);
    html += row('Alimentación', data.food_restrictions || 'Ninguna');
    html += row('Canción', data.song || 'Ninguna');
  }
  if (data.message) {
    html += `<div class="pt-2 border-t border-stone-200 mt-2"><span class="font-semibold text-stone-500 block mb-1">Mensaje:</span><span class="italic text-sm">${escHtml(data.message)}</span></div>`;
  }
  $('rsvp-confirmed-details').innerHTML = html;

  const open = isRsvpOpen();
  show($('rsvp-edit-btn'), open);
  $('rsvp-confirmed-note').textContent = open
    ? 'Puedes modificar tu respuesta hasta el 15 de diciembre de 2026.'
    : 'El plazo para modificar terminó. Si necesitas cambiar algo, escríbenos directamente.';

  show($('rsvp-form'), false);
  show($('rsvp-confirmed'));
}

// --- RSVP Form ---
(function initRSVP() {
  const form = $('rsvp-form');
  if (!form) return;

  form.querySelectorAll('input[name="rsvp-status"]').forEach(r => r.addEventListener('change', updateConditionalFields));
  $('rsvp-edit-btn')?.addEventListener('click', showForm);
  $('rsvp-cancel-btn')?.addEventListener('click', () => showConfirmedView());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!guestToken || !guestData) return;

    const errorEl = $('rsvp-error');
    const status = selectedStatus();
    if (!status) {
      errorEl.textContent = RSVP_ERRORS.INVALID_STATUS;
      show(errorEl);
      return;
    }

    const going = status === 'yes';
    const payload = {
      p_token: guestToken,
      p_status: status,
      p_attending: going ? parseInt($('rsvp-attending').value, 10) : 0,
      p_food: going ? $('rsvp-food').value.trim() || null : null,
      p_song: going ? $('rsvp-song').value.trim() || null : null,
      p_message: $('rsvp-message').value.trim() || null,
    };

    const submitBtn = $('rsvp-submit');
    submitBtn.disabled = true;
    show(errorEl, false);

    try {
      const { error } = await supabase.rpc('submit_rsvp', payload);
      if (error) {
        const code = Object.keys(RSVP_ERRORS).find(k => error.message?.includes(k));
        errorEl.textContent = code ? RSVP_ERRORS[code] : 'No pudimos guardar tu respuesta. Intenta de nuevo.';
        show(errorEl);
        console.error('Error al guardar RSVP:', error);
        return;
      }
      guestData = {
        ...guestData,
        rsvp_status: status,
        attending: payload.p_attending,
        food_restrictions: payload.p_food,
        song: payload.p_song,
        message: payload.p_message,
      };
      showBanner(guestData);
      showConfirmedView(true);
      $('rsvp')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Error en RSVP:', err);
      errorEl.textContent = 'Error de conexión. Revisa tu internet e intenta de nuevo.';
      show(errorEl);
    } finally {
      submitBtn.disabled = false;
    }
  });
})();

// --- Expose to window for onclick handlers ---
window.mostrarToast = mostrarToast;
window.copiarCuenta = copiarCuenta;
window.copiarAlPortapapelesId = copiarAlPortapapelesId;
