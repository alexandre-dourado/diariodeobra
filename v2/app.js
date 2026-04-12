// app.js — Obra Log Pro

// ═══════════════════════════════════
// ESTADO
// ═══════════════════════════════════
const state = {
  obras: [],
  obraAtual: null,
  step: 1,
  totalSteps: 5,
  foto: null,
  atividade: null,
  atividadeCustom: '',
  temProblema: false,
  catProblema: '',
  descProblema: '',
  medicao: '',
  criado_por: 'Operário',
  modoCampo: false
};

const $ = id => document.getElementById(id);

// ═══════════════════════════════════
// INIT
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  registrarSW();
  iniciarConexao();
  carregarModoSalvo();
  carregarObras();
  bindHomeBtn();
  bindModoCampo();
});

function registrarSW() {
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}

// ═══════════════════════════════════
// CONEXÃO
// ═══════════════════════════════════
function iniciarConexao() {
  atualizarConexao();
  window.addEventListener('online',  () => { atualizarConexao(); sincronizar(); });
  window.addEventListener('offline', atualizarConexao);
}

function atualizarConexao() {
  const el = $('conn-pill');
  if (!el) return;
  if (navigator.onLine) {
    el.className = 'conn-pill online';
    el.innerHTML = '<span class="dot"></span>ONLINE';
  } else {
    el.className = 'conn-pill offline';
    el.innerHTML = '<span class="dot"></span>SEM SINAL';
  }
}

function setSyncing(on) {
  const el = $('conn-pill');
  if (!el) return;
  if (on) {
    el.className = 'conn-pill syncing';
    el.innerHTML = '<span class="dot"></span>SYNC...';
  } else {
    atualizarConexao();
  }
  const bar = $('sync-bar');
  if (bar) bar.classList.toggle('show', on);
}

// ═══════════════════════════════════
// MODO CAMPO
// ═══════════════════════════════════
function carregarModoSalvo() {
  const salvo = localStorage.getItem('obra_log_campo') === '1';
  state.modoCampo = salvo;
  aplicarModoCampo();
}

function aplicarModoCampo() {
  document.body.classList.toggle('modo-campo', state.modoCampo);
  const btn = $('btn-campo');
  if (btn) btn.classList.toggle('ativo', state.modoCampo);
}

function bindModoCampo() {
  const btn = $('btn-campo');
  if (!btn) return;
  btn.addEventListener('click', () => {
    state.modoCampo = !state.modoCampo;
    localStorage.setItem('obra_log_campo', state.modoCampo ? '1' : '0');
    aplicarModoCampo();
    aviso(state.modoCampo ? '🌞 Modo campo ativado' : '🖥️ Modo padrão', '');
  });
}

// ═══════════════════════════════════
// CARREGAR OBRAS
// ═══════════════════════════════════
async function carregarObras() {
  mostrarLoading('Carregando obras...');
  try {
    let obras;
    if (navigator.onLine) {
      obras = await API.listarObras();
      Storage.saveObras(obras);
    } else {
      obras = Storage.getObras();
    }
    state.obras = Array.isArray(obras) ? obras : [];
    renderObras(state.obras);
    atualizarStats();
  } catch (e) {
    state.obras = Storage.getObras();
    renderObras(state.obras);
    atualizarStats();
    if (!state.obras.length)
      aviso('Sem conexão — nenhuma obra em cache', 'warning');
  } finally {
    esconderLoading();
  }
}

function atualizarStats() {
  const elO = $('stat-obras');
  const elP = $('stat-pending');
  if (elO) elO.textContent = String(state.obras.length).padStart(2, '0');
  const fila = Storage.getQueue();
  if (elP) elP.textContent = String(fila.length).padStart(2, '0');
}

// ═══════════════════════════════════
// RENDER LISTA DE OBRAS
// ═══════════════════════════════════
const STATUS_CYCLE = [
  { cls: 'badge-andamento', txt: 'EM ANDAMENTO' },
  { cls: 'badge-pendente',  txt: 'PENDENTE'      },
  { cls: 'badge-ok',        txt: 'REGISTRADA'    },
];

function renderObras(obras) {
  const el = $('obras-list');
  if (!el) return;
  if (!obras || !obras.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏗️</div>
        <div class="empty-title">NENHUMA OBRA CADASTRADA</div>
        <div class="empty-sub">Peça ao encarregado ou gestor para cadastrar a obra no sistema.</div>
      </div>`;
    return;
  }

  el.innerHTML = obras.map((obra, i) => {
    const id   = obra.id_obra || '';
    const nome = obra.nome    || 'Obra sem nome';
    const emp  = obra.empresa || obra.endereco || '';
    const fotoUrl = obra.foto_url || '';
    const st   = STATUS_CYCLE[i % STATUS_CYCLE.length];
    const ie   = encodeURIComponent(id);
    const ne   = encodeURIComponent(nome);

    const mediaHtml = fotoUrl
      ? `<img src="${esc(fotoUrl)}" alt="${esc(nome)}"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholderStyle = fotoUrl ? 'display:none' : '';

    return `
    <div class="obra-card" onclick="abrirObra('${ie}','${ne}')">
      <div class="obra-card-media">
        ${mediaHtml}
        <div class="obra-card-media-placeholder" style="${placeholderStyle}">🏗️</div>
        <div class="obra-card-badge ${st.cls}">${st.txt}</div>
      </div>
      <div class="obra-card-body">
        <div class="obra-card-cod">CÓD • ${id.slice(0,8).toUpperCase()}</div>
        <div class="obra-card-nome">${esc(nome)}</div>
        <div class="obra-card-meta">
          ${emp ? `<div class="obra-card-empresa">👷 ${esc(emp)}</div>` : '<div></div>'}
          <div class="obra-card-cta">REGISTRAR →</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Busca
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const si = $('search-input');
    if (!si) return;
    si.addEventListener('input', () => {
      const q = si.value.toLowerCase().trim();
      renderObras(q
        ? state.obras.filter(o =>
            (o.nome||'').toLowerCase().includes(q) ||
            (o.empresa||'').toLowerCase().includes(q) ||
            (o.endereco||'').toLowerCase().includes(q))
        : state.obras);
    });
  }, 100);
});

// Botão Registrar home
function bindHomeBtn() {
  const btn = $('btn-registrar');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!state.obras.length) {
      aviso('Nenhuma obra disponível. Fale com o encarregado.', 'warning');
      return;
    }
    if (state.obras.length === 1) {
      const o = state.obras[0];
      abrirObra(encodeURIComponent(o.id_obra), encodeURIComponent(o.nome));
      return;
    }
    $('obras-list').scrollIntoView({ behavior: 'smooth' });
    aviso('Toque em uma obra para registrar', '');
  });
}

// ═══════════════════════════════════
// FLUXO
// ═══════════════════════════════════
window.abrirObra = function(ie, ne) {
  const id   = decodeURIComponent(ie);
  const nome = decodeURIComponent(ne);
  state.obraAtual = state.obras.find(o => o.id_obra === id) || { id_obra: id, nome };
  Object.assign(state, {
    step: 1, foto: null, atividade: null, atividadeCustom: '',
    temProblema: false, catProblema: '', descProblema: '', medicao: ''
  });

  $('screen-home').style.display  = 'none';
  $('screen-fluxo').style.display = 'block';
  window.scrollTo(0, 0);

  const bn = $('banner-nome'); if (bn) bn.textContent = state.obraAtual.nome || '—';
  const bc = $('banner-cod');  if (bc) bc.textContent = 'CÓD • ' + (state.obraAtual.id_obra||'').slice(0,8).toUpperCase();

  renderEtapa();
};

window.voltarHome = function() {
  $('screen-fluxo').style.display = 'none';
  $('screen-home').style.display  = 'block';
  window.scrollTo(0, 0);
  atualizarStats();
};

window.voltarPasso = function() {
  if (state.step === 1) { voltarHome(); return; }
  state.step--;
  renderEtapa();
  window.scrollTo(0, 0);
};

// ═══════════════════════════════════
// STEP NAV
// ═══════════════════════════════════
const TITULOS = ['', 'FOTO DA OBRA', 'SERVIÇO', 'PROBLEMA?', 'QUANTIDADE', 'CONFIRMAR'];

function renderStepNav() {
  const s = state.step;
  const pct = Math.round(s / state.totalSteps * 100);

  // Dots
  const dc = $('step-dots');
  if (dc) {
    dc.innerHTML = Array.from({ length: state.totalSteps }, (_, i) => {
      const n = i + 1;
      const cls = n < s ? 'done' : n === s ? 'active' : '';
      return `<div class="step-dot ${cls}" data-n="${n}"></div>${n < state.totalSteps ? '<div class="step-dot-gap"></div>' : ''}`;
    }).join('');
  }

  const st = $('step-titulo');
  if (st) st.textContent = TITULOS[s];
  const sp = $('step-progresso');
  if (sp) sp.textContent = `${s}/${state.totalSteps} — ${pct}%`;
}

// ═══════════════════════════════════
// RENDER ETAPA
// ═══════════════════════════════════
function renderEtapa() {
  renderStepNav();
  const body = $('step-body');
  if (!body) return;

  // Força re-animação
  body.style.animation = 'none';
  body.offsetHeight; // reflow
  body.style.animation = '';

  switch (state.step) {
    case 1: body.innerHTML = htmlE1(); break;
    case 2: body.innerHTML = htmlE2(); break;
    case 3: body.innerHTML = htmlE3(); break;
    case 4: body.innerHTML = htmlE4(); break;
    case 5: body.innerHTML = htmlE5(); break;
  }

  atualizarBtnNext();
}

function atualizarBtnNext() {
  const btn = $('btn-next');
  if (!btn) return;
  const s = state.step;
  const ok = podeProsseguir();

  if (s === state.totalSteps) {
    btn.innerHTML = '✔ ENVIAR REGISTRO';
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');
    btn.disabled = false;
  } else {
    btn.innerHTML = 'CONTINUAR →';
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');
    btn.disabled = !ok;
  }
}

function podeProsseguir() {
  switch (state.step) {
    case 1: return !!state.foto;
    case 2: return state.atividade === 'outro'
      ? state.atividadeCustom.trim().length > 0
      : !!state.atividade;
    case 3: return true;
    case 4: return state.medicao !== '' && !isNaN(parseFloat(state.medicao));
    case 5: return true;
    default: return true;
  }
}

window.avancar = async function() {
  if (!podeProsseguir()) {
    aviso('Preencha antes de continuar', 'warning');
    return;
  }
  if (state.step === state.totalSteps) {
    await enviar();
    return;
  }
  state.step++;
  renderEtapa();
  window.scrollTo(0, 0);
};

// ═══════════════════════════════════
// ETAPA 1 — FOTO
// ═══════════════════════════════════
function htmlE1() {
  return `
    <p class="step-hint">Tire uma foto mostrando o serviço de hoje. A foto é obrigatória.</p>
    <div class="foto-zone ${state.foto ? 'tem-foto' : ''}" onclick="abrirCamera()">
      ${state.foto ? `<img src="${state.foto}" alt="Foto">` : ''}
      <div class="foto-placeholder">
        <div class="ico">📷</div>
        <div class="txt">TOQUE PARA<br>FOTOGRAFAR</div>
      </div>
    </div>
    <input type="file" id="file-cam" accept="image/*" capture="environment"
           style="display:none" onchange="processarFoto(this)">
    <button class="btn btn-secondary" onclick="abrirCamera()" style="margin-bottom:12px">
      📷 ${state.foto ? 'TROCAR FOTO' : 'ABRIR CÂMERA'}
    </button>
    ${!state.foto
      ? `<div class="inline-alert warn">
           <span class="alert-icon">⚠️</span>
           <div class="alert-text"><strong>Foto obrigatória.</strong> Fotografe o serviço realizado. Certifique-se de boa iluminação.</div>
         </div>`
      : `<div class="inline-alert ok">
           <span class="alert-icon">✅</span>
           <div class="alert-text"><strong>Foto capturada.</strong> Toque em CONTINUAR.</div>
         </div>`}
  `;
}

window.abrirCamera = function() {
  const el = $('file-cam'); if (el) el.click();
};

window.processarFoto = function(inp) {
  const file = inp.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h*MAX/w); w = MAX; }
        else        { w = Math.round(w*MAX/h); h = MAX; }
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      state.foto = c.toDataURL('image/jpeg', 0.75);
      renderEtapa();
    };
    img.src = e.target.result;
  };
  r.readAsDataURL(file);
};

// ═══════════════════════════════════
// ETAPA 2 — ATIVIDADE
// ═══════════════════════════════════
const ATIVIDADES = [
  { key: 'concretagem', lbl: 'Concretagem', ico: '🏗️' },
  { key: 'alvenaria',   lbl: 'Alvenaria',   ico: '🧱' },
  { key: 'eletrica',    lbl: 'Elétrica',    ico: '⚡' },
  { key: 'hidraulica',  lbl: 'Hidráulica',  ico: '🔧' },
  { key: 'pintura',     lbl: 'Pintura',     ico: '🖌️' },
  { key: 'escavacao',   lbl: 'Escavação',   ico: '⛏️' },
];

function htmlE2() {
  return `
    <p class="step-hint">O que foi realizado hoje? Selecione o serviço principal.</p>
    <div class="atividade-grid">
      ${ATIVIDADES.map(a => `
        <button class="ativ-btn ${state.atividade === a.key ? 'sel' : ''}"
                onclick="selAtiv('${a.key}')">
          <div class="ativ-check">✓</div>
          <div class="ativ-ico">${a.ico}</div>
          <div class="ativ-lbl">${a.lbl}</div>
        </button>`).join('')}
    </div>
    <div class="ativ-outro ${state.atividade === 'outro' ? 'sel' : ''}"
         onclick="selAtiv('outro')">
      <div class="ativ-outro-lbl">• • •&nbsp;&nbsp; Outro serviço</div>
      <span style="color:var(--text-muted)">›</span>
    </div>
    ${state.atividade === 'outro' ? `
      <input type="text" id="outro-inp" class="field-input"
             placeholder="Descreva o serviço..."
             value="${esc(state.atividadeCustom)}"
             oninput="state.atividadeCustom=this.value; atualizarBtnNext()">` : ''}
  `;
}

window.selAtiv = function(key) {
  state.atividade = key;
  renderEtapa();
  if (key === 'outro') setTimeout(() => { const el=$('outro-inp'); if(el) el.focus(); }, 80);
};

// ═══════════════════════════════════
// ETAPA 3 — PROBLEMA
// ═══════════════════════════════════
const CATEGORIAS = [
  { key: 'atraso',   nome: 'Atraso',           sub: 'Cronograma',  ico: '🕐' },
  { key: 'material', nome: 'Falta de material', sub: 'Suprimentos', ico: '📦' },
  { key: 'acidente', nome: 'Acidente / Risco',  sub: 'Segurança',   ico: '🚨' },
  { key: 'outro',    nome: 'Outro',             sub: 'Geral',       ico: '📝' },
];

function htmlE3() {
  return `
    <p class="step-hint">Aconteceu algum problema ou ocorrência hoje?</p>
    <div class="sn-grid">
      <button class="sn-btn ${state.temProblema ? 'sel-sim' : ''}" onclick="defProblema(true)">
        <div class="sn-lbl">SIM</div>
        <div class="sn-ico">⚠️</div>
      </button>
      <button class="sn-btn ${!state.temProblema ? 'sel-nao' : ''}" onclick="defProblema(false)">
        <div class="sn-lbl">NÃO</div>
        <div class="sn-ico">✅</div>
      </button>
    </div>
    ${state.temProblema ? `
      <div class="cat-label">TIPO DO PROBLEMA</div>
      <div class="cat-list">
        ${CATEGORIAS.map(c => `
          <div class="cat-item ${state.catProblema === c.key ? 'sel' : ''}"
               onclick="selCat('${c.key}')">
            <div>
              <div class="cat-nome">${c.nome}</div>
              <div class="cat-sub">${c.sub}</div>
            </div>
            <div class="cat-ico">${c.ico}</div>
          </div>`).join('')}
      </div>
      <div class="cat-label" style="margin-top:16px">DESCRIÇÃO (OPCIONAL)</div>
      <textarea class="field-textarea" rows="3" id="desc-prob"
                placeholder="Descreva o que aconteceu..."
                oninput="state.descProblema=this.value">${esc(state.descProblema)}</textarea>
    ` : ''}
  `;
}

window.defProblema = function(sim) {
  state.temProblema = sim;
  if (!sim) { state.catProblema = ''; state.descProblema = ''; }
  renderEtapa();
};

window.selCat = function(key) {
  state.catProblema = key;
  renderEtapa();
};

// ═══════════════════════════════════
// ETAPA 4 — MEDIÇÃO
// ═══════════════════════════════════
const CHIPS = [10, 20, 50, 100];

function htmlE4() {
  const chipSel = CHIPS.includes(Number(state.medicao));
  return `
    <p class="step-hint">Quanto foi executado hoje? Selecione uma quantidade ou digite.</p>
    <div class="sec-title">ATALHO RÁPIDO</div>
    <div class="med-chips">
      ${CHIPS.map(v => `
        <button class="med-chip ${Number(state.medicao)===v ? 'sel' : ''}"
                onclick="selChip(${v})">
          <div class="med-num">${v}</div>
          <div class="med-unit">M²</div>
        </button>`).join('')}
    </div>
    <div class="med-input-label">DIGITAR VALOR (M²)</div>
    <div class="med-input-wrap">
      <input type="number" inputmode="decimal" class="med-input" id="med-inp"
             value="${chipSel ? '' : esc(state.medicao)}"
             placeholder="0.00"
             oninput="state.medicao=this.value; atualizarBtnNext()">
      <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted)">M²</span>
    </div>
    <div class="inline-alert info">
      <span class="alert-icon">📐</span>
      <div class="alert-text">Informe a quantidade total do turno de hoje nesta obra.</div>
    </div>
  `;
}

window.selChip = function(v) {
  state.medicao = String(v);
  renderEtapa();
};

// ═══════════════════════════════════
// ETAPA 5 — RESUMO
// ═══════════════════════════════════
function htmlE5() {
  const atvL = ATIVIDADES.find(a => a.key === state.atividade)?.lbl
    || (state.atividade === 'outro' ? state.atividadeCustom : state.atividade) || '—';
  const catL = CATEGORIAS.find(c => c.key === state.catProblema)?.nome || '—';
  const hoje = new Date().toLocaleDateString('pt-BR');

  return `
    <p class="step-hint">Confira tudo abaixo antes de enviar. Toque em ENVIAR REGISTRO para finalizar.</p>
    <div class="resumo-card">
      <div class="resumo-row">
        <div class="resumo-sub">DATA</div>
        <div class="resumo-val">${hoje}</div>
      </div>
      <div class="resumo-row">
        <div class="resumo-sub">OBRA</div>
        <div class="resumo-val">${esc(state.obraAtual?.nome || '—')}</div>
      </div>
      <div class="resumo-row">
        <div class="resumo-sub">SERVIÇO REALIZADO</div>
        <div class="resumo-val">${esc(atvL)}</div>
      </div>
      <div class="resumo-row">
        <div class="resumo-sub">QUANTIDADE DO DIA</div>
        <div class="resumo-val big">${state.medicao || '0'} m²</div>
      </div>
    </div>
    ${state.temProblema
      ? `<div class="resumo-problema">
           <span style="font-size:1.1rem">❗</span>
           <div>
             <div class="rp-label">PROBLEMA REGISTRADO</div>
             <div class="rp-val">${esc(catL)}${state.descProblema ? ` — ${esc(state.descProblema)}` : ''}</div>
           </div>
         </div>`
      : `<div class="inline-alert ok" style="margin-bottom:12px">
           <span class="alert-icon">✅</span>
           <div class="alert-text">Nenhum problema registrado hoje.</div>
         </div>`}
    ${state.foto
      ? `<div class="resumo-foto-label">FOTO DO SERVIÇO</div>
         <img class="resumo-foto" src="${state.foto}" alt="Foto">`
      : ''}
    <button class="btn btn-ghost" onclick="voltarPasso()">← Corrigir etapa anterior</button>
  `;
}

// ═══════════════════════════════════
// ENVIAR
// ═══════════════════════════════════
async function enviar() {
  const atvL = ATIVIDADES.find(a => a.key === state.atividade)?.lbl
    || state.atividadeCustom || state.atividade || 'Não informado';
  const catL = CATEGORIAS.find(c => c.key === state.catProblema)?.nome || '';

  const dados = {
    id_obra: state.obraAtual.id_obra,
    descricao_atividade: atvL,
    problemas: state.temProblema
      ? `${catL}${state.descProblema ? ' — ' + state.descProblema : ''}`
      : '',
    medicoes: state.medicao + ' m²',
    criado_por: state.criado_por
  };

  if (!navigator.onLine) {
    Storage.addToQueue({ ...dados, _foto: state.foto });
    atualizarStats();
    aviso('💾 Salvo no celular. Será enviado quando tiver sinal.', 'warning');
    setTimeout(voltarHome, 2500);
    return;
  }

  mostrarLoading('Enviando registro...');
  try {
    const reg = await API.criarRegistro(dados);
    if (state.foto && reg?.id_registro) {
      const elL = $('loading-msg');
      if (elL) elL.textContent = 'ENVIANDO FOTO...';
      await API.uploadFoto(reg.id_registro, state.foto);
    }
    esconderLoading();
    aviso('✅ Registro enviado com sucesso!', 'success');
    setTimeout(voltarHome, 2200);
  } catch (e) {
    esconderLoading();
    Storage.addToQueue({ ...dados, _foto: state.foto });
    atualizarStats();
    aviso('⚠️ Falha na rede. Salvo localmente — será enviado depois.', 'warning');
    setTimeout(voltarHome, 2500);
  }
}

// ═══════════════════════════════════
// SYNC AUTOMÁTICO
// ═══════════════════════════════════
async function sincronizar() {
  const fila = Storage.getQueue();
  if (!fila.length) return;
  setSyncing(true);
  aviso(`📡 Enviando ${fila.length} registro(s) pendente(s)...`, 'warning');
  let ok = 0;
  for (const item of [...fila]) {
    try {
      const foto  = item._foto;
      const dados = { ...item };
      delete dados._foto; delete dados.id_local; delete dados.criado_em;
      const reg = await API.criarRegistro(dados);
      if (foto && reg?.id_registro) await API.uploadFoto(reg.id_registro, foto);
      Storage.removeFromQueue(item.id_local);
      ok++;
    } catch { break; }
  }
  setSyncing(false);
  atualizarStats();
  if (ok) aviso(`✅ ${ok} registro(s) enviado(s)!`, 'success');
}

// ═══════════════════════════════════
// UTILS
// ═══════════════════════════════════
function mostrarLoading(msg = 'Aguarde...') {
  const el = $('loading-msg'); if (el) el.textContent = msg.toUpperCase();
  const ov = $('loading-overlay'); if (ov) ov.classList.add('show');
}
function esconderLoading() {
  const ov = $('loading-overlay'); if (ov) ov.classList.remove('show');
}

let _tt;
function aviso(msg, tipo = '') {
  const el = $('toast'); if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${tipo}`;
  clearTimeout(_tt);
  _tt = setTimeout(() => { el.className = 'toast'; }, 3500);
}

function esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Globais
window.voltarHome = voltarHome;
window.atualizarBtnNext = atualizarBtnNext;
window.state = state;
window.aviso = aviso;
