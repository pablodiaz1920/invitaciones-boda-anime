import { supabase } from '../lib/supabase.js';

const COLS = 9;
let guests = [];

// --- Init ---
(async function initAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    showDashboard();
    loadGuests();
  } else {
    showLogin();
  }
})();

// --- UI toggle ---
function showLogin() {
  document.getElementById('admin-login')?.classList.remove('hidden');
  document.getElementById('admin-dashboard')?.classList.add('hidden');
}

function showDashboard() {
  document.getElementById('admin-login')?.classList.add('hidden');
  document.getElementById('admin-dashboard')?.classList.remove('hidden');
}

// --- Login ---
window.handleAdminLogin = async function () {
  const email = document.getElementById('admin-email')?.value.trim();
  const password = document.getElementById('admin-password')?.value;
  const errorEl = document.getElementById('admin-login-error');
  const showError = (msg) => { if (errorEl) { errorEl.textContent = msg; errorEl.classList.remove('hidden'); } };
  if (!email || !password) return showError('Ingresa email y contraseña');

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showError(error.message);
  errorEl?.classList.add('hidden');
  showDashboard();
  loadGuests();
};

window.handleAdminLogout = async function () {
  await supabase.auth.signOut();
  showLogin();
};

// --- Load guests ---
function tableMessage(text, cls = 'text-stone-400') {
  const tbody = document.getElementById('guests-table-body');
  if (tbody) tbody.innerHTML = `<tr><td colspan="${COLS}" class="text-center py-8 ${cls}">${escHtml(text)}</td></tr>`;
}

async function loadGuests() {
  const stats = document.getElementById('admin-stats');
  tableMessage('Cargando invitados...');

  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tableMessage('Error al cargar. Verifica que ejecutaste supabase-setup.sql.', 'text-red-400');
    return;
  }

  guests = data || [];
  if (guests.length === 0) {
    // Con RLS, un usuario que no está en admin_emails ve la tabla vacía
    tableMessage('No hay invitados (o tu email no está en la tabla admin_emails).');
    if (stats) stats.innerHTML = '<p class="text-stone-400">0 invitados registrados</p>';
    return;
  }

  renderGuests(guests);
  renderStats(guests);
}

function renderStats(data) {
  const stats = document.getElementById('admin-stats');
  if (!stats) return;
  const sum = (arr, fn) => arr.reduce((acc, g) => acc + (Number(fn(g)) || 0), 0);

  const yes = data.filter(g => g.rsvp_status === 'yes');
  const no = data.filter(g => g.rsvp_status === 'no');
  const pending = data.filter(g => !g.rsvp_status);

  const totalPasses = sum(data, g => g.passes);
  const peopleComing = sum(yes, g => g.attending ?? g.passes);
  const pendingPasses = sum(pending, g => g.passes);
  const openedPending = pending.filter(g => g.opened_at).length;

  stats.innerHTML = `
    <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-2 text-sm">
      <span class="text-stone-300">Invitaciones: <strong class="text-white">${data.length}</strong> <span class="text-stone-500">(${totalPasses} pases)</span></span>
      <span class="text-green-400">✓ Asistirán: <strong>${peopleComing}</strong> personas <span class="text-stone-500">(${yes.length} inv.)</span></span>
      <span class="text-red-400">✗ No asistirán: <strong>${no.length}</strong> inv.</span>
      <span class="text-amber-400">⏳ Pendientes: <strong>${pending.length}</strong> inv. <span class="text-stone-500">(${pendingPasses} pases, ${openedPending} ya lo vieron)</span></span>
    </div>
  `;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' });
}

function renderGuests(data) {
  const tbody = document.getElementById('guests-table-body');
  if (!tbody) return;

  tbody.innerHTML = data.map(g => {
    const statusBadge = g.rsvp_status === 'yes'
      ? '<span class="bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-bold">✓ Sí</span>'
      : g.rsvp_status === 'no'
        ? '<span class="bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">✗ No</span>'
        : '<span class="bg-stone-600/20 text-stone-400 px-2 py-0.5 rounded-full text-xs">⏳ Pendiente</span>';

    const attending = g.rsvp_status === 'yes' ? `${g.attending ?? g.passes}/${g.passes}` : '-';
    const seen = g.opened_at
      ? `<span class="text-green-400" title="Abrió su link: ${escHtml(formatDate(g.opened_at))}"><i class="fa-solid fa-eye"></i></span>`
      : '<span class="text-stone-600" title="Aún no abre su link"><i class="fa-solid fa-eye-slash"></i></span>';
    const cell = (v) => v ? escHtml(v) : '-';

    return `<tr class="border-b border-stone-800 hover:bg-stone-800/50 transition">
      <td class="py-3 px-3 text-sm font-medium">${escHtml(g.name)}</td>
      <td class="py-3 px-3 text-sm text-center">${Number(g.passes)}</td>
      <td class="py-3 px-3 text-sm text-center" title="${g.responded_at ? 'Respondió: ' + escHtml(formatDate(g.responded_at)) : ''}">${statusBadge}</td>
      <td class="py-3 px-3 text-sm text-center">${attending}</td>
      <td class="py-3 px-3 text-sm text-center">${seen}</td>
      <td class="py-3 px-3 text-xs text-stone-400 max-w-[120px] truncate hidden md:table-cell" title="${escHtml(g.food_restrictions || '')}">${cell(g.food_restrictions)}</td>
      <td class="py-3 px-3 text-xs text-stone-400 max-w-[120px] truncate hidden md:table-cell" title="${escHtml(g.song || '')}">${cell(g.song)}</td>
      <td class="py-3 px-3 text-xs text-stone-400 max-w-[180px] truncate hidden lg:table-cell" title="${escHtml(g.message || '')}">${cell(g.message)}</td>
      <td class="py-3 px-3 text-sm text-center whitespace-nowrap">
        <button type="button" data-action="copy" data-id="${Number(g.id)}" class="text-amber-400 hover:text-amber-300 px-1.5" title="Copiar link"><i class="fa-solid fa-link"></i></button>
        <button type="button" data-action="whatsapp" data-id="${Number(g.id)}" class="text-green-400 hover:text-green-300 px-1.5" title="Enviar WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
        <button type="button" data-action="delete" data-id="${Number(g.id)}" class="text-red-400 hover:text-red-300 px-1.5" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
      </td>
    </tr>`;
  }).join('');
}

// --- Acciones de la tabla (sin onclick en línea, para no inyectar nombres en JS) ---
document.getElementById('guests-table-body')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const guest = guests.find(g => String(g.id) === btn.dataset.id);
  if (!guest) return;
  if (btn.dataset.action === 'copy') copyLink(guest);
  else if (btn.dataset.action === 'whatsapp') sendWp(guest);
  else if (btn.dataset.action === 'delete') deleteGuest(guest);
});

document.getElementById('export-csv-btn')?.addEventListener('click', exportCsv);

// --- Add guest ---
window.addGuest = async function () {
  const nameInput = document.getElementById('new-guest-name');
  const name = nameInput?.value.trim();
  const passes = parseInt(document.getElementById('new-guest-passes')?.value || '1', 10);
  const errorEl = document.getElementById('add-guest-error');

  if (!name) {
    if (errorEl) { errorEl.textContent = 'Escribe el nombre del invitado'; errorEl.classList.remove('hidden'); }
    return;
  }
  errorEl?.classList.add('hidden');

  const { data, error } = await supabase
    .from('guests')
    .insert({ name, passes })
    .select();

  if (error) {
    if (errorEl) { errorEl.textContent = 'Error: ' + error.message; errorEl.classList.remove('hidden'); }
    return;
  }

  if (nameInput) nameInput.value = '';
  window.mostrarToast?.('¡Invitado añadido!');
  await loadGuests();

  const created = data?.[0];
  if (created) {
    setTimeout(() => copyLink(created), 300);
    setTimeout(() => {
      if (confirm(`¿Enviar WhatsApp a ${created.name} ahora?`)) sendWp(created);
    }, 800);
  }
};

// --- Delete guest ---
async function deleteGuest(guest) {
  if (!confirm(`¿Eliminar a "${guest.name}" definitivamente? Su link dejará de funcionar.`)) return;
  const { error } = await supabase.from('guests').delete().eq('id', guest.id);
  if (error) { window.mostrarToast?.('Error al eliminar'); return; }
  window.mostrarToast?.('Invitado eliminado');
  loadGuests();
}

// --- Links ---
function guestLink(guest) {
  const basePath = window.location.pathname.replace(/\/admin.*$/, '/') || '/';
  return `${window.location.origin}${basePath}?token=${encodeURIComponent(guest.token)}`;
}

function copyLink(guest) {
  navigator.clipboard.writeText(guestLink(guest)).then(() => {
    window.mostrarToast?.('¡Link copiado al portapapeles!');
  });
}

function sendWp(guest) {
  const msg = `✨ ¡HOLA! ${guest.name.toUpperCase()} ✨\n\nTenemos el gran honor de invitarlos a formar parte de nuestra tripulación en la aventura más importante de nuestras vidas: ¡NUESTRA BODA! 💍☠️🍃\n\n👇 Entren a su invitación personalizada aquí:\n${guestLink(guest)}\n\n¡Los esperamos en la Gran Ruta de la Vida el 30 de enero de 2027! 🌸⚔️`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
}

// --- Export CSV ---
function exportCsv() {
  if (!guests.length) return;
  const status = (s) => (s === 'yes' ? 'Sí' : s === 'no' ? 'No' : 'Pendiente');
  const header = ['Nombre', 'Pases', 'Estado', 'Asisten', 'Alimentación', 'Canción', 'Mensaje', 'Abrió link', 'Respondió', 'Link'];
  const rows = guests.map(g => [
    g.name,
    g.passes,
    status(g.rsvp_status),
    g.rsvp_status === 'yes' ? (g.attending ?? g.passes) : 0,
    g.food_restrictions || '',
    g.song || '',
    g.message || '',
    formatDate(g.opened_at),
    formatDate(g.responded_at),
    guestLink(g),
  ]);
  const csvCell = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // evita fórmulas al abrir en Excel
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `invitados-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- Importar CSV (Excel / Google Sheets) ---
const MAX_PASSES = 20; // igual que la restricción guests_passes_check de la base de datos
let importRows = [];

// "  José   PÉREZ " → "jose perez", para detectar duplicados aunque cambien tildes o mayúsculas
function normalizeName(str) {
  return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Lector de CSV con comillas ("Pérez, Ana") y separador , ; o tabulador
function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const count = (ch) => firstLine.split(ch).length - 1;
  const delimiter = [';', '\t', ','].reduce((best, ch) => (count(ch) > count(best) ? ch : best), ',');

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const NAME_HEADERS = ['nombre', 'name', 'invitado', 'invitados', 'nombre del invitado', 'nombres', 'familia'];
const PASSES_HEADERS = ['pases', 'passes', 'pase', 'cantidad', 'personas', 'numero de pases', 'no. pases', 'n pases'];

function analyzeCsv(text) {
  const rows = parseCsv(text).map(r => r.map(c => c.trim()));
  const nonEmpty = rows.filter(r => r.some(c => c !== ''));
  if (!nonEmpty.length) throw new Error('El archivo está vacío.');

  const header = nonEmpty[0].map(normalizeName);
  let nameCol = header.findIndex(h => NAME_HEADERS.includes(h));
  let passesCol = header.findIndex(h => PASSES_HEADERS.includes(h));
  let firstDataRow = 1;

  if (nameCol === -1) {
    // Sin encabezados reconocibles: si la 2ª columna es un número, asumimos "Nombre, Pases" sin cabecera
    if (nonEmpty[0].length >= 2 && /^\d+$/.test(nonEmpty[0][1])) {
      nameCol = 0; passesCol = 1; firstDataRow = 0;
    } else {
      throw new Error('No encontré la columna "Nombre". La primera fila debe tener los encabezados Nombre y Pases.');
    }
  }

  const existing = new Map(guests.map(g => [normalizeName(g.name), g]));
  const seenInFile = new Set();

  return rows.map((r, i) => ({ r, line: i + 1 }))
    .filter(({ r }) => r.some(c => c !== ''))
    .slice(firstDataRow)
    .map(({ r, line }) => {
      const name = (r[nameCol] || '').replace(/\s+/g, ' ').trim();
      const rawPasses = passesCol === -1 ? '' : (r[passesCol] || '').trim();
      const row = { line, name, passes: null, status: 'new', note: '' };

      if (!name) return { ...row, status: 'error', note: 'Falta el nombre' };
      if (name.length > 200) return { ...row, status: 'error', note: 'Nombre demasiado largo' };

      if (rawPasses === '') {
        row.passes = 1;
        row.note = 'Sin pases: se usará 1';
      } else if (!/^\d+$/.test(rawPasses) || Number(rawPasses) < 1 || Number(rawPasses) > MAX_PASSES) {
        return { ...row, status: 'error', note: `Pases inválidos ("${rawPasses}"): usa un número del 1 al ${MAX_PASSES}` };
      } else {
        row.passes = Number(rawPasses);
      }

      const key = normalizeName(name);
      const already = existing.get(key);
      if (already) {
        const diff = Number(already.passes) !== row.passes ? ` (en la web tiene ${already.passes} ${Number(already.passes) === 1 ? 'pase' : 'pases'})` : '';
        return { ...row, status: 'exists', note: `Ya existe, se salta${diff}` };
      }
      if (seenInFile.has(key)) return { ...row, status: 'dup', note: 'Repetido en el archivo, se salta' };
      seenInFile.add(key);
      return row;
    });
}

const IMPORT_STATUS = {
  new: { label: 'Nuevo', cls: 'text-green-400' },
  exists: { label: 'Ya existe', cls: 'text-stone-400' },
  dup: { label: 'Repetido', cls: 'text-stone-400' },
  error: { label: 'Error', cls: 'text-red-400' },
};

function renderImportPreview() {
  const toImport = importRows.filter(r => r.status === 'new');
  const n = (s) => importRows.filter(r => r.status === s).length;
  const people = toImport.reduce((a, r) => a + r.passes, 0);

  document.getElementById('import-summary').innerHTML = `
    <span class="text-green-400">✓ Nuevos: <strong>${toImport.length}</strong> <span class="text-stone-500">(${people} pases)</span></span>
    <span class="text-stone-400">Ya existen: <strong>${n('exists')}</strong></span>
    ${n('dup') ? `<span class="text-stone-400">Repetidos: <strong>${n('dup')}</strong></span>` : ''}
    ${n('error') ? `<span class="text-red-400">✗ Con errores: <strong>${n('error')}</strong> <span class="text-stone-500">(no se importan; corrígelos y vuelve a subir el archivo)</span></span>` : ''}
  `;

  document.getElementById('import-preview-body').innerHTML = importRows.map(r => {
    const st = IMPORT_STATUS[r.status];
    return `<tr class="border-b border-stone-800 ${r.status === 'new' ? '' : 'opacity-70'}">
      <td class="py-2 px-3 text-xs text-stone-500">${r.line}</td>
      <td class="py-2 px-3">${r.name ? escHtml(r.name) : '<span class="text-stone-500">—</span>'}</td>
      <td class="py-2 px-3 text-center">${r.passes ?? '-'}</td>
      <td class="py-2 px-3 text-xs"><span class="${st.cls} font-semibold">${st.label}</span>${r.note ? ` <span class="text-stone-400">· ${escHtml(r.note)}</span>` : ''}</td>
    </tr>`;
  }).join('');

  const btn = document.getElementById('import-confirm-btn');
  btn.disabled = toImport.length === 0;
  btn.innerHTML = toImport.length
    ? `<i class="fa-solid fa-check mr-1"></i>Importar ${toImport.length} ${toImport.length === 1 ? 'invitado' : 'invitados'}`
    : 'Nada nuevo que importar';

  document.getElementById('import-preview').classList.remove('hidden');
}

async function readCsvFile(file) {
  const buffer = await file.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(buffer);
  // Excel en Windows a veces guarda el CSV en Windows-1252: si aparecen "�", se vuelve a leer así
  if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buffer);
  return text.replace(/^﻿/, '');
}

function resetImport() {
  importRows = [];
  document.getElementById('import-preview')?.classList.add('hidden');
  document.getElementById('import-error')?.classList.add('hidden');
  const input = document.getElementById('import-csv-input');
  if (input) input.value = '';
}

document.getElementById('import-csv-input')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  const errorEl = document.getElementById('import-error');
  errorEl.classList.add('hidden');
  document.getElementById('import-preview').classList.add('hidden');
  if (!file) return;

  try {
    if (file.size > 1_000_000) throw new Error('El archivo es demasiado grande (máximo 1 MB).');
    if (/\.xlsx?$/i.test(file.name)) throw new Error('Ese es un archivo de Excel (.xlsx). Guárdalo primero como "CSV UTF-8" y súbelo de nuevo.');
    await loadGuests(); // lista al día para detectar duplicados
    importRows = analyzeCsv(await readCsvFile(file));
    if (!importRows.length) throw new Error('No encontré invitados debajo de los encabezados.');
    renderImportPreview();
  } catch (err) {
    errorEl.textContent = err.message || 'No se pudo leer el archivo.';
    errorEl.classList.remove('hidden');
    e.target.value = '';
  }
});

document.getElementById('import-cancel-btn')?.addEventListener('click', resetImport);

document.getElementById('import-confirm-btn')?.addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const toImport = importRows.filter(r => r.status === 'new').map(r => ({ name: r.name, passes: r.passes }));
  if (!toImport.length) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Importando...';
  let imported = 0;
  try {
    for (let i = 0; i < toImport.length; i += 100) {
      const chunk = toImport.slice(i, i + 100);
      const { error } = await supabase.from('guests').insert(chunk);
      if (error) throw error;
      imported += chunk.length;
    }
    window.mostrarToast?.(`¡${imported} ${imported === 1 ? 'invitado importado' : 'invitados importados'}!`);
    resetImport();
  } catch (err) {
    resetImport();
    const errorEl = document.getElementById('import-error');
    errorEl.textContent = `Error al importar${imported ? ` (se guardaron ${imported} antes del error)` : ''}: ${err.message}. Vuelve a subir el archivo: los ya guardados se saltarán.`;
    errorEl.classList.remove('hidden');
  }
  await loadGuests();
});

document.getElementById('import-template-btn')?.addEventListener('click', () => {
  const csv = 'Nombre,Pases\r\nFamilia Pérez,4\r\nAna Gómez,2\r\nLuis Martínez,1\r\n';
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'plantilla-invitados.csv';
  a.click();
  URL.revokeObjectURL(a.href);
});

// --- Helpers ---
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML.replace(/"/g, '&quot;');
}
