import { supabase } from '../lib/supabase.js';

// --- State ---
let currentSession = null;

// --- Init ---
(async function initAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentSession = session;
    showDashboard();
    loadGuests();
  } else {
    showLogin();
  }
})();

// --- UI toggle ---
function showLogin() {
  const login = document.getElementById('admin-login');
  const dash = document.getElementById('admin-dashboard');
  if (login) login.classList.remove('hidden');
  if (dash) dash.classList.add('hidden');
}

function showDashboard() {
  const login = document.getElementById('admin-login');
  const dash = document.getElementById('admin-dashboard');
  if (login) login.classList.add('hidden');
  if (dash) dash.classList.remove('hidden');
}

// --- Login ---
window.handleAdminLogin = async function () {
  const email = document.getElementById('admin-email')?.value.trim();
  const password = document.getElementById('admin-password')?.value;
  const errorEl = document.getElementById('admin-login-error');
  if (!email || !password) { if (errorEl) errorEl.textContent = 'Ingresa email y contraseña'; errorEl?.classList.remove('hidden'); return; }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (errorEl) errorEl.textContent = error.message;
    errorEl?.classList.remove('hidden');
    return;
  }
  currentSession = data.session;
  showDashboard();
  loadGuests();
};

window.handleAdminLogout = async function () {
  await supabase.auth.signOut();
  currentSession = null;
  showLogin();
};

// --- Load guests ---
async function loadGuests() {
  const tbody = document.getElementById('guests-table-body');
  const stats = document.getElementById('admin-stats');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-stone-400">Cargando invitados...</td></tr>';

  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-400">Error al cargar. Verifica que la tabla "guests" existe.</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-stone-400">Aún no hay invitados. ¡Añade el primero!</td></tr>';
    if (stats) stats.innerHTML = '<p class="text-stone-400">0 invitados registrados</p>';
    return;
  }

  renderGuests(data);
  renderStats(data);
}

function renderStats(data) {
  const stats = document.getElementById('admin-stats');
  if (!stats) return;
  const total = data.length;
  const confirmed = data.filter(g => g.rsvp_status === 'yes').length;
  const declined = data.filter(g => g.rsvp_status === 'no').length;
  const pending = total - confirmed - declined;
  stats.innerHTML = `
    <div class="flex flex-wrap gap-4 text-sm">
      <span class="text-stone-300">Total: <strong class="text-white">${total}</strong></span>
      <span class="text-green-400">✓ Confirmados: <strong>${confirmed}</strong></span>
      <span class="text-red-400">✗ Rechazados: <strong>${declined}</strong></span>
      <span class="text-amber-400">⏳ Pendientes: <strong>${pending}</strong></span>
    </div>
  `;
}

function renderGuests(data) {
  const tbody = document.getElementById('guests-table-body');
  if (!tbody) return;

  tbody.innerHTML = data.map(g => {
    const basePath = window.location.pathname.replace(/\/admin.*$/, '') || '/';
    const link = `${window.location.origin}${basePath}?token=${g.token}`;
    const statusBadge = g.rsvp_status === 'yes'
      ? '<span class="bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-bold">✓ Sí</span>'
      : g.rsvp_status === 'no'
        ? '<span class="bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">✗ No</span>'
        : '<span class="bg-stone-600/20 text-stone-400 px-2 py-0.5 rounded-full text-xs">⏳ Pendiente</span>';

    return `<tr class="border-b border-stone-800 hover:bg-stone-800/50 transition">
      <td class="py-3 px-3 text-sm font-medium">${escHtml(g.name)}</td>
      <td class="py-3 px-3 text-sm text-center">${g.passes}</td>
      <td class="py-3 px-3 text-sm text-center">${statusBadge}</td>
      <td class="py-3 px-3 text-xs text-stone-400 max-w-[120px] truncate">${g.food_restrictions ? escHtml(g.food_restrictions) : '-'}</td>
      <td class="py-3 px-3 text-xs text-stone-400 max-w-[120px] truncate">${g.song ? escHtml(g.song) : '-'}</td>
      <td class="py-3 px-3 text-sm text-center whitespace-nowrap">
        <button onclick="copyLink('${g.token}')" class="text-amber-400 hover:text-amber-300 px-1.5" title="Copiar link"><i class="fa-solid fa-link"></i></button>
        <button onclick="sendWp('${g.token}','${escAttr(g.name)}')" class="text-green-400 hover:text-green-300 px-1.5" title="Enviar WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
        <button onclick="deleteGuest(${g.id})" class="text-red-400 hover:text-red-300 px-1.5" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    </tr>`;
  }).join('');
}

// --- Add guest ---
window.addGuest = async function () {
  const name = document.getElementById('new-guest-name')?.value.trim();
  const passes = document.getElementById('new-guest-passes')?.value || '1';
  const errorEl = document.getElementById('add-guest-error');

  if (!name) {
    if (errorEl) { errorEl.textContent = 'Escribe el nombre del invitado'; errorEl.classList.remove('hidden'); }
    return;
  }
  errorEl?.classList.add('hidden');

  const token = crypto.randomUUID();
  const { data, error } = await supabase
    .from('guests')
    .insert({ name, passes: parseInt(passes), token })
    .select();

  if (error) {
    if (errorEl) { errorEl.textContent = 'Error: ' + error.message; errorEl.classList.remove('hidden'); }
    return;
  }

  document.getElementById('new-guest-name').value = '';
  window.mostrarToast?.('¡Invitado añadido!');
  loadGuests();

  if (data?.[0]) {
    const token = data[0].token;
    const gName = data[0].name;
    setTimeout(() => copyLink(token), 500);
    setTimeout(() => {
      if (confirm(`¿Enviar WhatsApp a ${gName} ahora?`)) sendWp(token, gName);
    }, 1000);
  }
};

// --- Delete guest ---
window.deleteGuest = async function (id) {
  if (!confirm('¿Eliminar este invitado definitivamente?')) return;
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) { window.mostrarToast?.('Error al eliminar'); return; }
  window.mostrarToast?.('Invitado eliminado');
  loadGuests();
};

// --- Copy link ---
window.copyLink = function (token) {
  const basePath = window.location.pathname.replace(/\/admin.*$/, '') || '/';
  const link = `${window.location.origin}${basePath}?token=${token}`;
  navigator.clipboard.writeText(link).then(() => {
    window.mostrarToast?.('¡Link copiado al portapapeles!');
  });
};

// --- Send WhatsApp ---
window.sendWp = function (token, name) {
  const basePath = window.location.pathname.replace(/\/admin.*$/, '') || '/';
  const link = `${window.location.origin}${basePath}?token=${token}`;
  const msg = `✨ ¡HOLA! ${name.toUpperCase()} ✨\n\nTenemos el gran honor de invitarlos a formar parte de nuestra tripulación en la aventura más importante de nuestras vidas: ¡NUESTRA BODA! 💍☠️🍃\n\n👇 Entren a su invitación personalizada aquí:\n${link}\n\n¡Los esperamos en la Gran Ruta de la Vida el 30 de enero de 2027! 🌸⚔️`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
};

// --- Helpers ---
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
function escAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
