const API = 'http://localhost:8000';
const inputs = { VH: false, VV: false, P: false };
const BITS = ['evh', 'eah', 'emh', 'evv', 'eav', 'emv', 'epv', 'epm'];

const TRUTH = {
  EVH: [1, 0, 0, 0, 0, 1, 0, 1],
  EAH: [0, 1, 0, 0, 0, 1, 0, 1],
  EVV: [0, 0, 1, 1, 0, 0, 0, 1],
  EAV: [0, 0, 1, 0, 1, 0, 0, 1],
  EPV: [0, 0, 1, 0, 0, 1, 1, 0],
};

// ── UI ───────────────────────────────────────────────

function buildBits(bits) {
  document.getElementById('bits-grid').innerHTML = BITS.map(k => `
    <div class="bit ${bits[k] ? 'on' : ''}">
      <span class="bit-k">${k}</span>
      <span class="bit-v">${bits[k]}</span>
    </div>`).join('');
}

function buildTable(active) {
  document.querySelector('#truth-table tbody').innerHTML =
    Object.entries(TRUTH).map(([n, row]) => {
      const hl = active && active.includes(n) ? 'hl' : '';
      return `<tr class="${hl}"><td>${n}</td>${row.map(v => `<td>${v}</td>`).join('')}</tr>`;
    }).join('');
}

function setLights(h, v, p) {
  ['h1', 'h2'].forEach(id => {
    document.getElementById(id + '-r').className = 'sl' + (h === 'red'    ? ' red'    : '');
    document.getElementById(id + '-y').className = 'sl' + (h === 'yellow' ? ' yellow' : '');
    document.getElementById(id + '-g').className = 'sl' + (h === 'green'  ? ' green'  : '');
  });
  ['v1', 'v2'].forEach(id => {
    document.getElementById(id + '-r').className = 'sl' + (v === 'red'    ? ' red'    : '');
    document.getElementById(id + '-y').className = 'sl' + (v === 'yellow' ? ' yellow' : '');
    document.getElementById(id + '-g').className = 'sl' + (v === 'green'  ? ' green'  : '');
  });
  ['p1', 'p2'].forEach(id => {
    document.getElementById(id + '-r').className = 'pl' + (p === 'red'   ? ' red'   : '');
    document.getElementById(id + '-g').className = 'pl' + (p === 'green' ? ' green' : '');
  });
}

function animateCars(h, v, p) {
  const ch = document.getElementById('car-h');
  const cv = document.getElementById('car-v');
  const cp = document.getElementById('car-p');

  // Carro horizontal
  if (h === 'green') {
    ch.style.opacity = '1';
    ch.style.left = '200px';
    ch.style.transform = 'translateY(-50%)';
    setTimeout(() => { ch.style.left = '-30px'; }, 1800);
  } else {
    ch.style.left = inputs.VH ? '60px' : '-30px';
    ch.style.opacity = inputs.VH ? '1' : '0';
    ch.style.transform = 'translateY(-50%)';
  }

  // Carro vertical
  if (v === 'green') {
    cv.style.opacity = '1';
    cv.style.top = '200px';
    cv.style.transform = 'translateX(-50%) rotate(90deg)';
    setTimeout(() => { cv.style.top = '-30px'; }, 1800);
  } else {
    cv.style.top = inputs.VV ? '60px' : '-30px';
    cv.style.opacity = inputs.VV ? '1' : '0';
    cv.style.transform = 'translateX(-50%) rotate(90deg)';
  }

  // Pedestre
  cp.style.opacity = inputs.P ? '1' : '0';
  if (p === 'green') {
    cp.style.top = '200px';
    setTimeout(() => { cp.style.top = '50%'; }, 1500);
  } else {
    cp.style.top = '50%';
  }
}

function addLog(txt, type = 'ok') {
  const list = document.getElementById('log-list');
  const t = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const el = document.createElement('div');
  el.className = `log-e ${type}`;
  el.textContent = `[${t}] ${txt}`;
  list.prepend(el);
  if (list.children.length > 20) list.lastChild.remove();
}

function applyResult(d) {
  const nm = document.getElementById('state-name');
  nm.textContent = d.estado_ativo;
  nm.className = 'state-name'
    + (d.conflito              ? ' conflict' : '')
    + (d.estado_ativo === 'IDLE' ? ' idle'    : '');

  document.getElementById('state-expr').textContent = d.expressao_logica;
  document.getElementById('state-desc').textContent = d.descricao;

  setLights(d.semaforo_h, d.semaforo_v, d.semaforo_p);
  animateCars(d.semaforo_h, d.semaforo_v, d.semaforo_p);
  buildBits(d.bits);
  buildTable(d.estado_ativo);
}

// ── Lógica local (fallback sem backend) ──────────────

function runLocal({ VH, VV, P }) {
  let estado, desc, expr;
  let h = 'red', v = 'red', p = 'red';
  let bits = Object.fromEntries(BITS.map(k => [k, 0]));

  if (VH && !VV) {
    estado = 'EVH';
    desc   = 'Horizontal livre. Via vertical bloqueada.';
    expr   = 'VH ∧ ¬VV → evh';
    h = 'green';
    bits.evh = 1; bits.emv = 1; bits.epm = 1;

  } else if (VV && !VH) {
    estado = 'EVV';
    desc   = 'Vertical livre. Via horizontal bloqueada.';
    expr   = 'VV ∧ ¬VH → evv';
    v = 'green';
    bits.emh = 1; bits.evv = 1; bits.epm = 1;

  } else if (P && !VH && !VV) {
    estado = 'EPV';
    desc   = 'Sem veículos. Pedestre pode atravessar.';
    expr   = 'P ∧ ¬VH ∧ ¬VV → epv';
    p = 'green';
    bits.emh = 1; bits.emv = 1; bits.epv = 1;

  } else if (VH && VV) {
    estado = 'CONFLITO';
    desc   = 'Fase de transição amarela.';
    expr   = 'VH ∧ VV → eah, eav';
    h = 'yellow'; v = 'yellow';
    bits.eah = 1; bits.eav = 1; bits.epm = 1;

  } else if (P && (VH || VV)) {
    estado = VH ? 'EAH→EPV' : 'EAV→EPV';
    desc   = 'Pedestre aguarda fim do fluxo.';
    expr   = `P ∧ V${VH ? 'H' : 'V'} → aguarda epv`;
    if (VH) h = 'yellow';
    if (VV) v = 'yellow';

  } else {
    estado = 'IDLE';
    desc   = 'Nenhuma entrada ativa. Sistema em espera.';
    expr   = '¬VH ∧ ¬VV ∧ ¬P';
    bits.emh = 1; bits.emv = 1; bits.epm = 1;
  }

  applyResult({
    estado_ativo:     estado,
    descricao:        desc,
    expressao_logica: expr,
    bits,
    conflito:   estado.includes('CONF'),
    semaforo_h: h,
    semaforo_v: v,
    semaforo_p: p,
  });
}

// ── Chamada à API ─────────────────────────────────────

async function callApi() {
  const body = { VH: inputs.VH, VV: inputs.VV, P: inputs.P };

  document.getElementById('req-display').innerHTML =
    `<span class="m">POST</span> /avaliar · <span>${JSON.stringify(body)}</span>`;

  try {
    const res = await fetch(`${API}/avaliar`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const d = await res.json();
    applyResult(d);
    addLog(`${d.estado_ativo} · ${d.expressao_logica}`, d.conflito ? 'conf' : 'ok');

  } catch {
    runLocal(body);
    addLog('Backend offline · rodando localmente', 'conf');
  }
}

// ── Toggle de entradas ────────────────────────────────

function toggle(key) {
  inputs[key] = !inputs[key];

  document.getElementById('card-' + key).classList.toggle('on', inputs[key]);
  document.getElementById('sw-'   + key).classList.toggle('on', inputs[key]);

  const lbl = document.querySelector(`#card-${key} .toggle-label`);
  if (lbl) lbl.textContent = inputs[key] ? 'ativo' : 'inativo';

  callApi();
}

// ── Inicialização ─────────────────────────────────────

buildTable(null);
buildBits(Object.fromEntries(
  BITS.map(k => [k, ['emh', 'emv', 'epm'].includes(k) ? 1 : 0])
));
callApi();