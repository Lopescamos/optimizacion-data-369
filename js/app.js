/* =============================================
   OLIMPIADAS 369 - Digitador de Resultados
   app.js
   ============================================= */

'use strict';

/* ── CONFIGURACIÓN ─────────────────────────────────────────── */

const NIVELES = {
  inicial:   { label: 'Inicial',    grados: ['3 AÑOS','4 AÑOS','5 AÑOS'] },
  primaria:  { label: 'Primaria',   grados: ['1°','2°','3°','4°','5°','6°'] },
  secundaria:{ label: 'Secundaria', grados: ['1°','2°','3°','4°','5°'] }
};

/* ── ESTADO ────────────────────────────────────────────────── */

const state = {
  bloqueActivo: false,
  curso:  '',
  nivel:  '',
  grado:  '',
  registros: [],
  gradosCompletados: {},
  colegios: []
};

/* ── PERSISTENCIA ──────────────────────────────────────────── */

const SK_STATE    = 'olimpiadas369_state';
const SK_COLEGIOS = 'olimpiadas369_colegios';
const SK_HISTORIAL= 'olimpiadas369_historial';

function cargarStorage() {
  try {
    const raw = localStorage.getItem(SK_STATE);
    if (raw) {
      const p = JSON.parse(raw);
      state.registros         = p.registros         || [];
      state.gradosCompletados = p.gradosCompletados  || {};
      state.curso             = p.curso              || '';
      state.nivel             = p.nivel              || '';
      state.grado             = p.grado              || '';
      state.bloqueActivo      = p.bloqueActivo       || false;
    }
    const extra = JSON.parse(localStorage.getItem(SK_COLEGIOS) || '[]');
    state.colegios = [...new Set([...DATA.colegios, ...extra])].sort();
  } catch(e) {
    state.colegios = [...DATA.colegios].sort();
  }
}

function guardarStorage() {
  try {
    localStorage.setItem(SK_STATE, JSON.stringify({
      registros:         state.registros,
      gradosCompletados: state.gradosCompletados,
      curso:             state.curso,
      nivel:             state.nivel,
      grado:             state.grado,
      bloqueActivo:      state.bloqueActivo
    }));
  } catch(e) {}
}

function guardarColegio(nombre) {
  nombre = (nombre || '').toUpperCase().trim();
  if (!nombre || state.colegios.includes(nombre)) return;
  state.colegios.push(nombre);
  state.colegios.sort();
  try {
    const extra = state.colegios.filter(c => !DATA.colegios.includes(c));
    localStorage.setItem(SK_COLEGIOS, JSON.stringify(extra));
  } catch(e) {}
}

function guardarEnHistorial(reg) {
  try {
    const clave = claveBloque(state.curso, state.nivel, state.grado);
    const h = JSON.parse(localStorage.getItem(SK_HISTORIAL) || '{}');
    if (!h[clave]) h[clave] = [];
    h[clave].push({ nombre: reg.nombre, colegio: reg.colegio });
    localStorage.setItem(SK_HISTORIAL, JSON.stringify(h));
  } catch(e) {}
}

/* ── UTILIDADES ────────────────────────────────────────────── */

function calcPuntaje(c, i) { return (c * 20) - (i * 1); }

function claveBloque(curso, nivel, grado) { return `${curso}|${nivel}|${grado}`; }

function cursoParCompletado() {
  if (!state.curso || !state.nivel || !state.grado) return false;
  const par = state.curso === 'mate' ? 'comu' : 'mate';
  return !!state.gradosCompletados[claveBloque(par, state.nivel, state.grado)];
}

function labelGrado() {
  const n = NIVELES[state.nivel];
  if (!n) return '';
  return state.nivel === 'inicial' ? state.grado : `${state.grado} ${n.label}`;
}

function normalizar(s) {
  return (s || '').toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim();
}

function escHtml(s) {
  return (s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── TOAST ─────────────────────────────────────────────────── */

let _toastTimer = null;
function showToast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `visible ${tipo}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = ''; }, 2800);
}

/* ── AUTOCOMPLETE INLINE (estilo Excel) ────────────────────── */
//
// Al escribir, se rellena el input con la mejor sugerencia y la
// parte "ghost" queda seleccionada. Solo Enter la acepta; cualquier
// otra tecla reemplaza la selección de forma natural (comportamiento
// nativo del navegador).

function getInlineSuggestionNombre(typed) {
  if (!typed || typed.length < 2) return null;

  if (cursoParCompletado()) {
    // Modo 2: nombre completo desde historial del curso par
    const par  = state.curso === 'mate' ? 'comu' : 'mate';
    const clave = claveBloque(par, state.nivel, state.grado);
    try {
      const h    = JSON.parse(localStorage.getItem(SK_HISTORIAL) || '{}');
      const regs = h[clave] || [];
      const q    = normalizar(typed);
      const hit  = regs.find(r => normalizar(r.nombre).startsWith(q));
      return hit ? hit.nombre : null;
    } catch(e) { return null; }
  } else {
    // Modo 1: completar la última palabra (apellido)
    const val   = normalizar(typed);
    const partes = val.split(' ');
    const ultima = partes[partes.length - 1];
    if (!ultima || ultima.length < 2) return null;

    const match = DATA.apellidos.find(a => normalizar(a).startsWith(ultima));
    if (!match) return null;

    // Prefijo = todo lo anterior a la última palabra
    const prefijo = typed.substring(0, typed.length - ultima.length);
    return prefijo + match;
  }
}

/* ── DROPDOWN COLEGIO ──────────────────────────────────────── */

let _idxColegio = -1;

function getSugerenciasColegio(query) {
  if (!query || query.length < 2) return [];
  const q = normalizar(query);
  return state.colegios
    .filter(c => {
      const cn = normalizar(c);
      return cn.startsWith(q) || cn.includes(q);
    })
    .sort((a, b) => {
      const sa = normalizar(a).startsWith(q) ? 1 : 0;
      const sb = normalizar(b).startsWith(q) ? 1 : 0;
      return sb - sa;
    })
    .slice(0, 10);
}

function destacar(query, texto) {
  const q = normalizar(query);
  const t = normalizar(texto);
  const idx = t.indexOf(q);
  if (idx === -1) return escHtml(texto);
  return escHtml(texto.substring(0, idx))
    + '<mark>' + escHtml(texto.substring(idx, idx + q.length)) + '</mark>'
    + escHtml(texto.substring(idx + q.length));
}

function mostrarDropColegio(sugs, query) {
  const drop = document.getElementById('drop-colegio');
  if (!sugs.length) { cerrarDropColegio(); return; }

  drop.innerHTML = sugs.map((s, i) =>
    `<div class="drop-item" data-idx="${i}" data-texto="${escHtml(s)}">${destacar(query, s)}</div>`
  ).join('');

  drop.querySelectorAll('.drop-item').forEach(el => {
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      seleccionarColegio(el.dataset.texto);
    });
  });

  drop.classList.add('visible');
  _idxColegio = -1;
}

function cerrarDropColegio() {
  const drop = document.getElementById('drop-colegio');
  drop.classList.remove('visible');
  drop.innerHTML = '';
  _idxColegio = -1;
}

function seleccionarColegio(texto) {
  document.getElementById('input-colegio').value = texto;
  guardarColegio(texto);
  cerrarDropColegio();
  document.getElementById('input-correctas').focus();
}

function manejarTeclasColegio(e) {
  const drop  = document.getElementById('drop-colegio');
  const items = drop.querySelectorAll('.drop-item');
  const abierto = drop.classList.contains('visible');

  if (e.key === 'ArrowDown') {
    if (!abierto) return;
    e.preventDefault();
    _idxColegio = Math.min(_idxColegio + 1, items.length - 1);
    items.forEach((el, i) => el.classList.toggle('selected', i === _idxColegio));
    if (items[_idxColegio]) items[_idxColegio].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    if (!abierto) return;
    e.preventDefault();
    _idxColegio = Math.max(_idxColegio - 1, 0);
    items.forEach((el, i) => el.classList.toggle('selected', i === _idxColegio));
    if (items[_idxColegio]) items[_idxColegio].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    if (abierto && _idxColegio >= 0 && items[_idxColegio]) {
      e.preventDefault();
      seleccionarColegio(items[_idxColegio].dataset.texto);
    } else if (abierto && items.length === 1) {
      e.preventDefault();
      seleccionarColegio(items[0].dataset.texto);
    } else {
      e.preventDefault();
      cerrarDropColegio();
      document.getElementById('input-correctas').focus();
    }
  } else if (e.key === 'Escape') {
    cerrarDropColegio();
  }
}

function aplicarInline(input, suggestion) {
  if (!suggestion) return;
  const typedLen = input.value.length;
  if (suggestion.length <= typedLen) return;
  input.value = suggestion;
  input.setSelectionRange(typedLen, suggestion.length);
}

/* ── RENDER BLOQUE ─────────────────────────────────────────── */

function renderBloque() {
  const sinBloque = !state.bloqueActivo;
  document.getElementById('seccion-bloque-selector').style.display = sinBloque ? 'flex' : 'none';
  document.getElementById('info-bloque-fijado').style.display      = sinBloque ? 'none' : 'flex';

  const badge = document.getElementById('badge-curso');
  badge.style.display = sinBloque ? 'none' : 'block';

  document.body.classList.toggle('sin-bloque', sinBloque);

  if (!sinBloque) {
    const cursoLabel = state.curso === 'mate' ? '📐 MATEMÁTICA' : '📖 COMUNICACIÓN';
    document.getElementById('label-bloque-fijado').textContent = `${cursoLabel}  ·  ${labelGrado()}`;
    badge.textContent  = state.curso === 'mate' ? 'MATEMÁTICA' : 'COMUNICACIÓN';
    badge.className    = `badge-curso ${state.curso}`;
    actualizarModo();
    renderTabla();
  }
}

function actualizarModo() {
  const el = document.getElementById('indicador-modo');
  if (!state.bloqueActivo) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  if (cursoParCompletado()) {
    el.className    = 'modo2';
    el.textContent  = '✦ MODO 2 — Sugerencia nombre completo (par completado)';
  } else {
    el.className    = 'modo1';
    el.textContent  = '✧ MODO 1 — Sugerencia de apellido parcial';
  }
}

function poblarGrados(nivelKey) {
  const sel = document.getElementById('sel-grado');
  sel.innerHTML = '<option value="">Selecciona grado</option>';
  if (!nivelKey || !NIVELES[nivelKey]) return;
  NIVELES[nivelKey].grados.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = nivelKey === 'inicial' ? g : `${g} ${NIVELES[nivelKey].label}`;
    sel.appendChild(opt);
  });
}

/* ── PREVIEW PUNTAJE ───────────────────────────────────────── */

function actualizarPreview() {
  const c = parseInt(document.getElementById('input-correctas').value) || 0;
  const i = parseInt(document.getElementById('input-incorrectas').value) || 0;
  const p = calcPuntaje(c, i);
  const el = document.getElementById('preview-valor');
  el.textContent = p;
  el.style.color = p >= 0 ? '#FFC000' : '#E74C3C';
}

/* ── AGREGAR REGISTRO ──────────────────────────────────────── */

function agregarRegistro() {
  const nombre      = document.getElementById('input-nombre').value.trim().toUpperCase();
  const colegio     = document.getElementById('input-colegio').value.trim().toUpperCase();
  const correctasRaw   = document.getElementById('input-correctas').value.trim();
  const incorrectasRaw = document.getElementById('input-incorrectas').value.trim();
  const correctas   = parseInt(correctasRaw);
  const incorrectas = parseInt(incorrectasRaw);

  if (!nombre)   { showToast('⚠ Ingresa el nombre', 'warn'); document.getElementById('input-nombre').focus(); return; }
  if (!colegio)  { showToast('⚠ Ingresa el colegio', 'warn'); document.getElementById('input-colegio').focus(); return; }
  if (!correctasRaw || isNaN(correctas) || correctas < 0)    { showToast('⚠ Correctas inválido', 'warn'); document.getElementById('input-correctas').focus(); return; }
  if (!incorrectasRaw || isNaN(incorrectas) || incorrectas < 0){ showToast('⚠ Incorrectas inválido', 'warn'); document.getElementById('input-incorrectas').focus(); return; }

  const reg = {
    id:         Date.now(),
    nombre,
    colegio,
    correctas,
    incorrectas,
    puntaje:    calcPuntaje(correctas, incorrectas),
    hora:       null,
    orden:      null
  };

  state.registros.push(reg);
  guardarColegio(colegio);
  guardarEnHistorial(reg);
  guardarStorage();
  limpiarFormulario();
  renderTabla();
  showToast(`✓ ${nombre} registrado`, 'ok');
  document.getElementById('input-nombre').focus();

  document.getElementById('btn-marcar-completo').style.display = 'inline-flex';
}

function limpiarFormulario() {
  document.getElementById('input-nombre').value      = '';
  document.getElementById('input-colegio').value     = '';
  document.getElementById('input-correctas').value   = '';
  document.getElementById('input-incorrectas').value = '';
  document.getElementById('preview-valor').textContent = '0';
}

function eliminarRegistro(id) {
  state.registros = state.registros.filter(r => r.id !== id);
  guardarStorage();
  renderTabla();
}

/* ── HORA INLINE EN TABLA ──────────────────────────────────── */
//
// Cada fila tiene una celda con [data-hora-id]. Al pulsar el botón
// "+hora" aparecen 3 mini-inputs: HH → MM → Orden (Enter avanza).
// Aceptar con Enter en Orden guarda; Escape cancela.

function abrirEditorHora(id) {
  const reg   = state.registros.find(r => r.id === id);
  const celda = document.querySelector(`[data-hora-id="${id}"]`);
  if (!reg || !celda) return;

  const [hhActual, mmActual] = reg.hora ? reg.hora.split(':') : ['', ''];
  const ordActual = reg.orden != null ? String(reg.orden) : '';

  celda.innerHTML = `
    <div class="hora-editor">
      <input class="hora-hh"  type="text" inputmode="numeric" maxlength="2"
             placeholder="HH" value="${escHtml(hhActual)}" title="Hora">
      <span class="hora-sep">:</span>
      <input class="hora-mm"  type="text" inputmode="numeric" maxlength="2"
             placeholder="MM" value="${escHtml(mmActual)}" title="Minutos">
      <span class="hora-sep">#</span>
      <input class="hora-ord" type="text" inputmode="numeric" maxlength="2"
             placeholder="1"  value="${escHtml(ordActual)}" title="Orden">
    </div>
  `;

  const inHH  = celda.querySelector('.hora-hh');
  const inMM  = celda.querySelector('.hora-mm');
  const inOrd = celda.querySelector('.hora-ord');

  [inHH, inMM, inOrd].forEach(inp => inp.addEventListener('focus', () => inp.select()));

  inHH.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inMM.focus(); }
    if (e.key === 'Escape') { cerrarEditorHora(id); }
  });

  inMM.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inOrd.focus(); }
    if (e.key === 'Escape') { cerrarEditorHora(id); }
  });

  inOrd.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); guardarHora(id, celda); }
    if (e.key === 'Escape') { cerrarEditorHora(id); }
  });

  inOrd.addEventListener('blur', () => {
    setTimeout(() => {
      if (!celda.querySelector(':focus')) guardarHora(id, celda);
    }, 150);
  });

  inHH.focus();
}

function guardarHora(id, celda) {
  const reg    = state.registros.find(r => r.id === id);
  const inHH   = celda.querySelector('.hora-hh');
  const inMM   = celda.querySelector('.hora-mm');
  const inOrd  = celda.querySelector('.hora-ord');
  if (!reg || !inHH) return;

  const hh  = (inHH.value  || '').trim();
  const mm  = (inMM.value  || '').trim();
  const ord = (inOrd.value || '').trim();

  if (hh || mm) {
    reg.hora  = `${hh.padStart(2,'0')}:${mm.padStart(2,'0')}`;
    reg.orden = ord ? parseInt(ord) : null;
  } else {
    reg.hora  = null;
    reg.orden = null;
  }

  guardarStorage();
  renderCeldaHora(id);
}

function cerrarEditorHora(id) { renderCeldaHora(id); }

function renderCeldaHora(id) {
  const reg   = state.registros.find(r => r.id === id);
  const celda = document.querySelector(`[data-hora-id="${id}"]`);
  if (!celda || !reg) return;

  if (reg.hora) {
    const ord = reg.orden != null ? ` · #${reg.orden}` : '';
    celda.innerHTML = `
      <span class="hora-valor">${escHtml(reg.hora)}${escHtml(ord)}</span>
      <button class="hora-editar-btn" title="Editar hora">✎</button>
    `;
    celda.querySelector('.hora-editar-btn')
         .addEventListener('click', () => abrirEditorHora(id));
  } else {
    celda.innerHTML = `<button class="hora-agregar-btn" title="Agregar hora">＋ hora</button>`;
    celda.querySelector('.hora-agregar-btn')
         .addEventListener('click', () => abrirEditorHora(id));
  }
}

/* ── ORDENAR REGISTROS ─────────────────────────────────────── */

function registrosOrdenados() {
  return [...state.registros].sort((a, b) => b.puntaje - a.puntaje);
}

/* ── RENDER TABLA ──────────────────────────────────────────── */

function renderTabla() {
  const tbody = document.getElementById('tbody-registros');
  tbody.innerHTML = '';

  document.getElementById('contador-badge').textContent =
    `${state.registros.length} alumno${state.registros.length !== 1 ? 's' : ''}`;
  document.getElementById('btn-exportar').disabled = !state.registros.length;

  if (!state.registros.length) {
    tbody.innerHTML = '<tr id="fila-vacia"><td colspan="8">Configura el bloque e ingresa registros.</td></tr>';
    return;
  }

  registrosOrdenados().forEach((reg, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.rowId = reg.id;
    tr.innerHTML = `
      <td class="td-num">${idx + 1}</td>
      <td class="td-nombre">${escHtml(reg.nombre)}</td>
      <td class="td-colegio">${escHtml(reg.colegio)}</td>
      <td class="td-correctas">${reg.correctas}</td>
      <td class="td-incorrectas">${reg.incorrectas}</td>
      <td class="td-puntaje">${reg.puntaje}</td>
      <td class="td-hora" data-hora-id="${reg.id}"></td>
      <td class="edit-actions">
        <button class="btn-editar-fila" data-id="${reg.id}" title="Editar">✎</button>
        <button class="btn-eliminar"    data-id="${reg.id}" title="Eliminar">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
    renderCeldaHora(reg.id);
    tr.querySelector('.btn-eliminar')
      .addEventListener('click', () => eliminarRegistro(reg.id));
    tr.querySelector('.btn-editar-fila')
      .addEventListener('click', () => editarFila(reg.id));
  });
}

/* ── EDICIÓN INLINE DE FILA ────────────────────────────────── */

function editarFila(id) {
  const reg = state.registros.find(r => r.id === id);
  const tr  = document.querySelector(`tr[data-row-id="${id}"]`);
  if (!reg || !tr) return;

  tr.classList.add('fila-editando');
  tr.innerHTML = `
    <td class="td-num">—</td>
    <td><input class="edit-cell-input" id="ei-nombre"
         value="${escHtml(reg.nombre)}" spellcheck="false"></td>
    <td><input class="edit-cell-input" id="ei-colegio"
         value="${escHtml(reg.colegio)}" spellcheck="false"></td>
    <td><input class="edit-cell-input num" id="ei-correctas"
         value="${reg.correctas}" maxlength="2" inputmode="numeric"></td>
    <td><input class="edit-cell-input num" id="ei-incorrectas"
         value="${reg.incorrectas}" maxlength="2" inputmode="numeric"></td>
    <td class="td-puntaje edit-puntaje-preview" id="ei-puntaje">${reg.puntaje}</td>
    <td class="td-hora" data-hora-id="${id}"></td>
    <td class="edit-actions">
      <button class="btn-save-edit"   title="Guardar">✓</button>
      <button class="btn-cancel-edit" title="Cancelar">✕</button>
    </td>
  `;
  renderCeldaHora(id);

  // Preview puntaje en tiempo real
  const inC = tr.querySelector('#ei-correctas');
  const inI = tr.querySelector('#ei-incorrectas');
  const elP = tr.querySelector('#ei-puntaje');
  const actualizarP = () => {
    const p = calcPuntaje(parseInt(inC.value) || 0, parseInt(inI.value) || 0);
    elP.textContent = p;
    elP.style.color = p >= 0 ? '' : 'var(--rojo)';
  };
  inC.addEventListener('input', actualizarP);
  inI.addEventListener('input', actualizarP);

  // Solo números en campos numéricos
  [inC, inI].forEach(inp => {
    inp.addEventListener('keypress', e => { if (!/[0-9]/.test(e.key)) e.preventDefault(); });
  });

  // Enter avanza entre campos
  const inN = tr.querySelector('#ei-nombre');
  const inCol = tr.querySelector('#ei-colegio');
  inN.addEventListener('keydown',   e => { if (e.key === 'Enter') { e.preventDefault(); inCol.focus(); } });
  inCol.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inC.focus(); } });
  inC.addEventListener('keydown',   e => { if (e.key === 'Enter') { e.preventDefault(); inI.focus(); } });
  inI.addEventListener('keydown',   e => { if (e.key === 'Enter') { e.preventDefault(); guardarEdicion(id, tr); } });

  tr.querySelector('.btn-save-edit')
    .addEventListener('click', () => guardarEdicion(id, tr));
  tr.querySelector('.btn-cancel-edit')
    .addEventListener('click', () => renderTabla());

  inN.focus();
  inN.select();
}

function guardarEdicion(id, tr) {
  const reg = state.registros.find(r => r.id === id);
  if (!reg) return;

  const nombre     = (tr.querySelector('#ei-nombre').value || '').trim().toUpperCase();
  const colegio    = (tr.querySelector('#ei-colegio').value || '').trim().toUpperCase();
  const correctas  = parseInt(tr.querySelector('#ei-correctas').value) || 0;
  const incorrectas= parseInt(tr.querySelector('#ei-incorrectas').value) || 0;

  if (!nombre)  { showToast('⚠ El nombre no puede estar vacío', 'warn'); return; }
  if (!colegio) { showToast('⚠ El colegio no puede estar vacío', 'warn'); return; }

  reg.nombre     = nombre;
  reg.colegio    = colegio;
  reg.correctas  = correctas;
  reg.incorrectas= incorrectas;
  reg.puntaje    = calcPuntaje(correctas, incorrectas);

  guardarColegio(colegio);
  guardarStorage();
  renderTabla();
  showToast('Registro actualizado', 'ok');
}

/* ── MARCAR GRADO COMPLETO ─────────────────────────────────── */

function marcarGradoCompleto() {
  const clave = claveBloque(state.curso, state.nivel, state.grado);
  state.gradosCompletados[clave] = true;
  guardarStorage();

  const btn = document.getElementById('btn-marcar-completo');
  btn.textContent = '✓ Grado completado';
  btn.classList.add('completado');
  btn.disabled = true;

  actualizarModo();
  showToast(`✓ ${labelGrado()} marcado como completado`, 'ok');
  document.getElementById('overlay-modal').classList.remove('visible');
}

/* ── EXPORTAR EXCEL ────────────────────────────────────────── */

async function exportarExcel() {
  if (!state.registros.length) { showToast('Sin datos para exportar', 'warn'); return; }
  showToast('Generando Excel...', 'ok');
  try {
    const XLSX = window.XLSX;
    const wb   = XLSX.utils.book_new();

    let sheetName = state.nivel === 'inicial'
      ? state.grado
      : `${state.grado} ${state.nivel === 'primaria' ? 'Primaria' : 'Secundaria'}`;
    sheetName = sheetName.substring(0, 31);

    const ws = XLSX.utils.aoa_to_sheet([]);
    const titulo = labelGrado().toUpperCase();

    XLSX.utils.sheet_add_aoa(ws, [
      [null],[null],[null],[null],
      [titulo, null, null, null, null, null, null, null, null],
      ['N°','NOMBRE Y APELLIDO','INSTITUCIÓN EDUCATIVA','CORRECTAS','INCORRECTAS','PUNTAJE','PUESTO','HORA','ORDEN']
    ], { origin: 'A1' });

    const dataStart = 7;
    registrosOrdenados().forEach((reg, idx) => {
      const rowNum = dataStart + idx;
      XLSX.utils.sheet_add_aoa(ws, [[
        idx + 1,
        reg.nombre,
        reg.colegio,
        reg.correctas,
        reg.incorrectas,
        { f: `+D${rowNum}*20-E${rowNum}*1` },
        '',
        reg.hora  || '',
        reg.orden != null ? reg.orden : ''
      ]], { origin: `A${rowNum}` });
    });

    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s:{r:4,c:0}, e:{r:4,c:8} });

    ws['!cols'] = [
      {wch:5},{wch:40},{wch:33},{wch:13},{wch:13},{wch:12},{wch:14},{wch:10},{wch:8}
    ];
    ws['!rows'] = [{hpt:15},{hpt:15},{hpt:15},{hpt:64},{hpt:27},{hpt:19}];

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const curso = state.curso === 'mate' ? 'MATEMATICA' : 'COMUNICACION';
    const fecha = new Date().toLocaleDateString('es-PE').replace(/\//g,'-');
    XLSX.writeFile(wb, `OLIMPIADAS369_${curso}_${titulo.replace(/ /g,'_')}_${fecha}.xlsx`);
    showToast('✓ Excel descargado', 'ok');
  } catch(err) {
    console.error(err);
    showToast('Error al generar Excel', 'err');
  }
}

/* ── INIT ──────────────────────────────────────────────────── */

function init() {
  cargarStorage();

  // Poblar selector de nivel
  const selNivel = document.getElementById('sel-nivel');
  Object.entries(NIVELES).forEach(([key, val]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = val.label;
    selNivel.appendChild(opt);
  });

  // Restaurar bloque activo si lo había
  if (state.bloqueActivo && state.curso && state.nivel && state.grado) {
    document.getElementById('sel-curso').value = state.curso;
    selNivel.value = state.nivel;
    poblarGrados(state.nivel);
    document.getElementById('sel-grado').value = state.grado;
  }

  renderBloque();
  renderTabla();

  // ── EVENTOS BLOQUE ──────────────────────────────────

  selNivel.addEventListener('change', function() { poblarGrados(this.value); });

  document.getElementById('btn-fijar-bloque').addEventListener('click', () => {
    const curso = document.getElementById('sel-curso').value;
    const nivel = document.getElementById('sel-nivel').value;
    const grado = document.getElementById('sel-grado').value;
    if (!curso || !nivel || !grado) {
      showToast('⚠ Selecciona curso, nivel y grado', 'warn'); return;
    }

    const mismo = curso === state.curso && nivel === state.nivel && grado === state.grado;
    if (!mismo && state.registros.length > 0) {
      if (!confirm(`Cambiar el bloque limpiará los ${state.registros.length} registros. ¿Continuar?`)) return;
    }
    if (!mismo) state.registros = [];

    state.curso = curso; state.nivel = nivel; state.grado = grado;
    state.bloqueActivo = true;
    guardarStorage();

    const clave = claveBloque(curso, nivel, grado);
    const btn   = document.getElementById('btn-marcar-completo');
    if (state.gradosCompletados[clave]) {
      btn.textContent = '✓ Grado completado';
      btn.classList.add('completado');
      btn.disabled = true;
      btn.style.display = 'inline-flex';
    } else {
      btn.textContent = '✔ Marcar grado completo';
      btn.classList.remove('completado');
      btn.disabled = false;
      btn.style.display = state.registros.length > 0 ? 'inline-flex' : 'none';
    }

    renderBloque();
    limpiarFormulario();
    document.getElementById('input-nombre').focus();
    showToast(`Bloque fijado: ${curso === 'mate' ? 'Matemática' : 'Comunicación'} — ${labelGrado()}`, 'ok');
  });

  document.getElementById('btn-cambiar-bloque').addEventListener('click', () => {
    state.bloqueActivo = false;
    guardarStorage();
    renderBloque();
  });

  // ── AUTOCOMPLETE INLINE ─────────────────────────────

  const inNombre  = document.getElementById('input-nombre');
  const inColegio = document.getElementById('input-colegio');

  inNombre.addEventListener('input', function(e) {
    // Si el usuario está borrando, no sugerir nada
    if (e.inputType && e.inputType.startsWith('delete')) return;
    const sug = getInlineSuggestionNombre(this.value);
    if (sug) aplicarInline(this, sug);
  });

  inNombre.addEventListener('keydown', function(e) {
    const ghostActivo = this.selectionStart < this.value.length
                        && this.selectionEnd === this.value.length;

    if (!ghostActivo) {
      if (e.key === 'Enter') { e.preventDefault(); inColegio.focus(); }
      return;
    }

    // Con ghost activo:
    if (e.key === 'Enter') {
      // Aceptar sugerencia
      e.preventDefault();
      this.setSelectionRange(this.value.length, this.value.length);
    } else if (
      e.key === 'Escape'    ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowUp'   ||
      e.key === 'ArrowDown' ||
      e.key === 'Home'      ||
      e.key === 'End'
    ) {
      // Rechazar ghost: conservar solo lo escrito y dejar cursor al final
      e.preventDefault();
      this.value = this.value.substring(0, this.selectionStart);
    }
    // ArrowRight, Tab y teclas imprimibles: el navegador reemplaza la
    // selección de forma natural → el evento input recalcula la sugerencia
  });

  inColegio.addEventListener('input', function() {
    const sugs = getSugerenciasColegio(this.value);
    mostrarDropColegio(sugs, this.value);
  });

  inColegio.addEventListener('keydown', manejarTeclasColegio);

  inColegio.addEventListener('blur', () => {
    setTimeout(cerrarDropColegio, 160);
  });

  // ── NAVEGACIÓN CAMPOS NUMÉRICOS ────────────────────

  const inCorrectas   = document.getElementById('input-correctas');
  const inIncorrectas = document.getElementById('input-incorrectas');

  [inCorrectas, inIncorrectas].forEach(inp => {
    inp.addEventListener('input', actualizarPreview);
    inp.addEventListener('keypress', e => { if (!/[0-9]/.test(e.key)) e.preventDefault(); });
  });

  inCorrectas.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inIncorrectas.focus(); }
  });

  inIncorrectas.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); agregarRegistro(); }
  });

  // ── BOTONES ─────────────────────────────────────────

  document.getElementById('btn-agregar').addEventListener('click', agregarRegistro);
  document.getElementById('btn-limpiar').addEventListener('click', () => {
    limpiarFormulario();
    document.getElementById('input-nombre').focus();
  });

  document.getElementById('btn-marcar-completo').addEventListener('click', () => {
    const clave = claveBloque(state.curso, state.nivel, state.grado);
    if (state.gradosCompletados[clave]) return;
    document.getElementById('overlay-modal').classList.add('visible');
  });

  document.getElementById('btn-modal-cancelar').addEventListener('click', () => {
    document.getElementById('overlay-modal').classList.remove('visible');
  });

  document.getElementById('btn-modal-confirmar').addEventListener('click', marcarGradoCompleto);

  document.getElementById('overlay-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('overlay-modal'))
      document.getElementById('overlay-modal').classList.remove('visible');
  });

  document.getElementById('btn-exportar').addEventListener('click', exportarExcel);

  // Shift+Enter = agregar desde cualquier parte
  document.addEventListener('keydown', e => {
    if (e.shiftKey && e.key === 'Enter' && state.bloqueActivo) {
      e.preventDefault();
      agregarRegistro();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
