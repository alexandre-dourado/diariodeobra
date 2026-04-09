// app.js — Diário de Obra — lógica principal

// ===================== ESTADO GLOBAL =====================
const state = {
  obras: [],
  obraAtual: null,
  step: 1,
  totalSteps: 5,
  foto: null,
  atividade: null,
  atividadeCustom: '',
  temProblema: false,
  categoriaProblema: '',
  descricaoProblema: '',
  medicao: '',
  criado_por: 'Operário'
};

const $ = id => document.getElementById(id);

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  registrarSW();
  atualizarConexao();
  window.addEventListener('online',  atualizarConexao);
  window.addEventListener('offline', atualizarConexao);
  await carregarObras();
  configurarBusca();
  configurarSyncOnline();
  configurarBotaoRegistrar();
});

// ===================== SERVICE WORKER =====================
function registrarSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

// ===================== CONEXÃO =====================
function atualizarConexao() {
  const el = $('online-badge');
  if (!el) return;
  if (navigator.onLine) {
    el.textContent = 'CONECTADO';
    el.className = 'badge-online online';
  } else {
    el.textContent = 'SEM SINAL';
    el.className = 'badge-online offline';
  }
}

// ===================== CARREGAR OBRAS =====================
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
    renderizarObras(state.obras);
    atualizarContadores();
  } catch (e) {
    state.obras = Storage.getObras();
    renderizarObras(state.obras);
    atualizarContadores();
    if (state.obras.length === 0) {
      mostrarAviso('Sem conexão — nenhuma obra em cache', 'warning');
    }
  } finally {
    esconderLoading();
  }
}

function atualizarContadores() {
  const elObras   = $('stat-obras');
  const elPending = $('stat-pending');
  if (elObras)   elObras.textContent   = String(state.obras.length).padStart(2, '0');
  const fila = Storage.getQueue();
  if (elPending) elPending.textContent = String(fila.length).padStart(2, '0');
}

// ===================== RENDER LISTA DE OBRAS =====================
function renderizarObras(obras) {
  const container = $('obras-list');
  if (!container) return;

  if (!obras || obras.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🏗️</div>
        <div class="msg">NENHUMA OBRA CADASTRADA</div>
        <div class="msg" style="font-size:0.75rem;margin-top:8px;font-weight:400;text-transform:none">
          Peça ao seu encarregado ou gestor para cadastrar a obra no sistema.
        </div>
      </div>`;
    return;
  }

  // Status visual — rotacionado por enquanto (back-end não retorna status)
  const statusOpts = [
    { classe: 'badge-em-andamento', texto: 'EM ANDAMENTO' },
    { classe: 'badge-pendente',     texto: 'PENDENTE'     },
    { classe: 'badge-registrada',   texto: 'REGISTRADA'   }
  ];

  container.innerHTML = obras.map((obra, i) => {
    const id   = obra.id_obra || '';
    const nome = obra.nome    || 'Obra sem nome';
    const emp  = obra.empresa || obra.endereco || '';
    const st   = statusOpts[i % statusOpts.length];
    const idSafe = encodeURIComponent(id);
    const nomeSafe = encodeURIComponent(nome);

    return `
    <div class="obra-card" onclick="selecionarObra('${idSafe}', '${nomeSafe}')">
      <div style="position:relative">
        <div class="obra-card-img-placeholder">🏗️</div>
        <div class="obra-card-badge ${st.classe}">${st.texto}</div>
      </div>
      <div class="obra-card-body">
        <div class="obra-card-id">CÓD: ${id.slice(0,8).toUpperCase()}</div>
        <div class="obra-card-name">${safe(nome)}</div>
        ${emp ? `<div class="obra-card-manager">👷 ${safe(emp)}</div>` : ''}
        <div class="obra-card-action">Toque para registrar →</div>
      </div>
    </div>`;
  }).join('');
}

function configurarBusca() {
  const inp = $('search-input');
  if (!inp) return;
  inp.addEventListener('input', () => {
    const q = inp.value.toLowerCase().trim();
    const filtradas = q
      ? state.obras.filter(o =>
          (o.nome     || '').toLowerCase().includes(q) ||
          (o.empresa  || '').toLowerCase().includes(q) ||
          (o.endereco || '').toLowerCase().includes(q)
        )
      : state.obras;
    renderizarObras(filtradas);
  });
}

function configurarBotaoRegistrar() {
  const btn = $('btn-registrar-home');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (state.obras.length === 0) {
      mostrarAviso('Nenhuma obra disponível. Fale com o encarregado.', 'warning');
      return;
    }
    if (state.obras.length === 1) {
      const o = state.obras[0];
      selecionarObra(encodeURIComponent(o.id_obra), encodeURIComponent(o.nome));
      return;
    }
    $('obras-list').scrollIntoView({ behavior: 'smooth' });
    mostrarAviso('Toque em uma obra para registrar', '');
  });
}

// ===================== SELECIONAR OBRA =====================
window.selecionarObra = function(idEnc, nomeEnc) {
  const id   = decodeURIComponent(idEnc);
  const nome = decodeURIComponent(nomeEnc);
  state.obraAtual = state.obras.find(o => o.id_obra === id) || { id_obra: id, nome };
  iniciarFluxo();
};

// ===================== FLUXO =====================
function iniciarFluxo() {
  Object.assign(state, {
    step: 1, foto: null, atividade: null, atividadeCustom: '',
    temProblema: false, categoriaProblema: '', descricaoProblema: '', medicao: ''
  });

  $('screen-home').style.display  = 'none';
  $('screen-steps').style.display = 'block';
  window.scrollTo(0, 0);

  const nomeBanner = $('obra-banner-name');
  const idBanner   = $('obra-banner-id');
  if (nomeBanner) nomeBanner.textContent = state.obraAtual.nome || '—';
  if (idBanner)   idBanner.textContent   = 'CÓD: ' + (state.obraAtual.id_obra || '').slice(0,8).toUpperCase();

  renderizarEtapa();
}

window.voltarHome = function() {
  $('screen-steps').style.display = 'none';
  $('screen-home').style.display  = 'block';
  window.scrollTo(0, 0);
  atualizarContadores();
};

// ===================== RENDER ETAPA =====================
function renderizarEtapa() {
  const s   = state.step;
  const pct = Math.round((s / state.totalSteps) * 100);

  const elFill  = $('progress-fill');
  const elPct   = $('step-pct');
  const elLabel = $('step-label');
  const elTitle = $('step-title');
  const elBody  = $('step-body');

  if (elFill)  elFill.style.width  = pct + '%';
  if (elPct)   elPct.textContent   = pct + '%';
  if (elLabel) elLabel.textContent = `ETAPA ${s} DE ${state.totalSteps}`;

  const titulos = ['', 'FOTO DA OBRA', 'O QUE FOI FEITO?', 'TEVE PROBLEMA?', 'QUANTO FEZ HOJE?', 'REVISAR E ENVIAR'];
  if (elTitle) elTitle.innerHTML = `ETAPA ${s}: ${titulos[s]}<span></span>`;

  if (!elBody) return;
  switch (s) {
    case 1: elBody.innerHTML = htmlEtapa1(); break;
    case 2: elBody.innerHTML = htmlEtapa2(); break;
    case 3: elBody.innerHTML = htmlEtapa3(); break;
    case 4: elBody.innerHTML = htmlEtapa4(); break;
    case 5: elBody.innerHTML = htmlEtapa5(); break;
  }

  atualizarBotaoNext();
}

function atualizarBotaoNext() {
  const btn = $('btn-next');
  if (!btn) return;
  if (state.step === state.totalSteps) {
    btn.innerHTML = '✔ ENVIAR REGISTRO';
    btn.classList.add('dark');
    btn.disabled = false;
  } else {
    btn.innerHTML = 'CONTINUAR →';
    btn.classList.remove('dark');
    btn.disabled = !podeContinuar();
  }
}

function podeContinuar() {
  switch (state.step) {
    case 1: return !!state.foto;
    case 2: return !!(state.atividade === 'outro' ? state.atividadeCustom.trim() : state.atividade);
    case 3: return true;
    case 4: return state.medicao !== '' && !isNaN(parseFloat(state.medicao));
    case 5: return true;
    default: return true;
  }
}

window.avancar = async function() {
  if (!podeContinuar()) {
    mostrarAviso('Preencha antes de continuar', 'warning');
    return;
  }
  if (state.step === state.totalSteps) {
    await enviarRegistro();
    return;
  }
  state.step++;
  renderizarEtapa();
  window.scrollTo(0, 0);
};

window.voltarPasso = function() {
  if (state.step === 1) { voltarHome(); return; }
  state.step--;
  renderizarEtapa();
  window.scrollTo(0, 0);
};

// ===================== ETAPA 1 — FOTO =====================
function htmlEtapa1() {
  return `
    <div class="photo-zone ${state.foto ? 'has-photo' : ''}" onclick="abrirCamera()">
      ${state.foto ? `<img src="${state.foto}" alt="Foto da obra">` : ''}
      <div class="photo-zone-placeholder">
        <div class="icon">📷</div>
        <div class="text">TOQUE PARA<br>TIRAR FOTO</div>
      </div>
    </div>
    <input type="file" id="file-input" accept="image/*" capture="environment"
           style="display:none" onchange="processarFoto(this)">
    <button class="btn-primary" onclick="abrirCamera()" style="margin-bottom:12px">
      📷 ${state.foto ? 'TROCAR FOTO' : 'ABRIR CÂMERA'}
    </button>
    ${!state.foto
      ? `<div class="field-alert">
           <div class="alert-icon">⚠️</div>
           <div class="alert-text"><strong>A foto é obrigatória.</strong><br>
           Tire uma foto do serviço realizado hoje.</div>
         </div>`
      : `<div class="field-tip">
           <div class="alert-icon">✅</div>
           <div class="alert-text"><strong>Foto registrada!</strong> Toque em CONTINUAR.</div>
         </div>`}
  `;
}

window.abrirCamera = function() {
  const inp = $('file-input');
  if (inp) inp.click();
};

window.processarFoto = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      // Redimensiona para max 1200px — reduz base64 ~80%
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else        { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      state.foto = canvas.toDataURL('image/jpeg', 0.75);
      renderizarEtapa();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// ===================== ETAPA 2 — ATIVIDADE =====================
const ATIVIDADES = [
  { key: 'concretagem', label: 'CONCRETAGEM', icon: '🏗️' },
  { key: 'alvenaria',   label: 'ALVENARIA',   icon: '🧱' },
  { key: 'eletrica',    label: 'ELÉTRICA',    icon: '⚡' },
  { key: 'hidraulica',  label: 'HIDRÁULICA',  icon: '🔧' },
  { key: 'pintura',     label: 'PINTURA',     icon: '🖌️' },
  { key: 'escavacao',   label: 'ESCAVAÇÃO',   icon: '⛏️' },
];

function htmlEtapa2() {
  return `
    <p class="step-hint">O que foi feito hoje? Toque em uma opção.</p>
    <div class="atividade-grid">
      ${ATIVIDADES.map(a => `
        <button class="atividade-btn ${state.atividade === a.key ? 'selected' : ''}"
                onclick="selecionarAtividade('${a.key}')">
          <div class="check">✓</div>
          <div class="icon">${a.icon}</div>
          <div class="label">${a.label}</div>
        </button>
      `).join('')}
    </div>
    <div class="atividade-outro ${state.atividade === 'outro' ? 'selected-outro' : ''}"
         onclick="selecionarAtividade('outro')">
      <div class="label">• • •&nbsp;&nbsp; OUTRO SERVIÇO</div>
      <span>›</span>
    </div>
    ${state.atividade === 'outro' ? `
      <input type="text" id="outro-input" class="search-input"
             style="margin-top:10px;font-size:1rem;padding:14px"
             placeholder="Descreva o serviço..."
             value="${safe(state.atividadeCustom)}"
             oninput="state.atividadeCustom = this.value; atualizarBotaoNext()">
    ` : ''}
  `;
}

window.selecionarAtividade = function(key) {
  state.atividade = key;
  renderizarEtapa();
  if (key === 'outro') {
    setTimeout(() => { const el = $('outro-input'); if (el) el.focus(); }, 80);
  }
};

// ===================== ETAPA 3 — PROBLEMA =====================
const CATEGORIAS = [
  { key: 'atraso',    nome: 'ATRASO',           sub: 'Cronograma',  icon: '🕐' },
  { key: 'material',  nome: 'FALTA DE MATERIAL', sub: 'Suprimentos', icon: '📦' },
  { key: 'acidente',  nome: 'ACIDENTE / RISCO',  sub: 'Segurança',   icon: '🚨' },
  { key: 'outro',     nome: 'OUTRO',             sub: 'Geral',       icon: '📝' },
];

function htmlEtapa3() {
  return `
    <p class="step-hint">Aconteceu algum problema hoje?</p>
    <div class="sim-nao-grid">
      <button class="sn-btn ${state.temProblema ? 'selected-sim' : ''}"
              onclick="definirProblema(true)">
        <div class="sn-label">SIM</div>
        <div class="sn-icon">⚠️</div>
      </button>
      <button class="sn-btn ${!state.temProblema ? 'selected-nao' : ''}"
              onclick="definirProblema(false)">
        <div class="sn-label">NÃO</div>
        <div class="sn-icon">✅</div>
      </button>
    </div>
    ${state.temProblema ? `
      <div class="categoria-label">QUAL FOI O PROBLEMA?</div>
      <div class="categoria-list">
        ${CATEGORIAS.map(c => `
          <div class="categoria-item ${state.categoriaProblema === c.key ? 'selected' : ''}"
               onclick="selecionarCategoria('${c.key}')">
            <div>
              <div class="cat-name">${c.nome}</div>
              <div class="cat-sub">${c.sub}</div>
            </div>
            <div class="cat-icon">${c.icon}</div>
          </div>
        `).join('')}
      </div>
      <textarea class="textarea-problema" rows="3" id="desc-problema"
                placeholder="Descreva o que aconteceu (opcional)..."
                oninput="state.descricaoProblema = this.value">${safe(state.descricaoProblema)}</textarea>
    ` : ''}
  `;
}

window.definirProblema = function(sim) {
  state.temProblema = sim;
  if (!sim) { state.categoriaProblema = ''; state.descricaoProblema = ''; }
  renderizarEtapa();
};

window.selecionarCategoria = function(key) {
  state.categoriaProblema = key;
  renderizarEtapa();
};

// ===================== ETAPA 4 — MEDIÇÃO =====================
const CHIPS_MEDICAO = [10, 20, 50, 100];

function htmlEtapa4() {
  const chipAtivo = CHIPS_MEDICAO.includes(Number(state.medicao));
  return `
    <p class="step-hint">Quanto foi feito hoje? Escolha ou digite a quantidade.</p>
    <div class="medicao-chips">
      ${CHIPS_MEDICAO.map(v => `
        <button class="chip-btn ${Number(state.medicao) === v ? 'selected' : ''}"
                onclick="selecionarChip(${v})">
          <div class="chip-val">${v}</div>
          <div class="chip-unit">M²</div>
        </button>
      `).join('')}
    </div>
    <div class="medicao-manual-label">DIGITAR QUANTIDADE (M²)</div>
    <div class="medicao-input-wrap">
      <input type="number" inputmode="decimal" class="medicao-input" id="medicao-input"
             value="${chipAtivo ? '' : safe(state.medicao)}"
             placeholder="0.00"
             oninput="state.medicao = this.value; atualizarBotaoNext()">
      <span style="font-size:1.2rem;color:var(--grey-mid)">📐</span>
    </div>
    <div class="field-tip">
      <div>
        <div class="tip-label">DICA</div>
        <div class="alert-text">Informe a quantidade total executada no seu turno de hoje.</div>
      </div>
    </div>
  `;
}

window.selecionarChip = function(v) {
  state.medicao = String(v);
  renderizarEtapa();
};

// ===================== ETAPA 5 — RESUMO =====================
function htmlEtapa5() {
  const ativLabel = ATIVIDADES.find(a => a.key === state.atividade)?.label
    || (state.atividade === 'outro' ? state.atividadeCustom : state.atividade) || '—';
  const catLabel = CATEGORIAS.find(c => c.key === state.categoriaProblema)?.nome || '—';
  const hoje = new Date().toLocaleDateString('pt-BR');

  return `
    <p class="step-hint">Confira as informações antes de enviar.</p>
    <div class="resumo-card">
      <div class="resumo-row">
        <div class="resumo-sublabel">DATA</div>
        <div class="resumo-value">${hoje}</div>
      </div>
      <div class="resumo-row">
        <div class="resumo-sublabel">OBRA</div>
        <div class="resumo-value">${safe(state.obraAtual?.nome || '—')}</div>
      </div>
      <div class="resumo-row">
        <div class="resumo-sublabel">SERVIÇO REALIZADO</div>
        <div class="resumo-value">${safe(ativLabel)}</div>
      </div>
      <div class="resumo-row">
        <div class="resumo-sublabel">QUANTIDADE DO DIA</div>
        <div class="resumo-value big">${state.medicao || '0'} m²</div>
      </div>
    </div>
    ${state.temProblema ? `
    <div class="resumo-problema-card">
      <div class="rp-icon">❗</div>
      <div>
        <div class="rp-title">PROBLEMA REGISTRADO</div>
        <div class="rp-text">
          ${safe(catLabel)}
          ${state.descricaoProblema ? `<br>${safe(state.descricaoProblema)}` : ''}
        </div>
      </div>
    </div>` : `
    <div class="field-tip">
      <div class="alert-icon">✅</div>
      <div class="alert-text">Nenhum problema registrado hoje.</div>
    </div>`}
    ${state.foto ? `
    <div class="media-section-label">FOTO DO SERVIÇO</div>
    <div class="media-grid">
      <img class="media-thumb" src="${state.foto}" alt="Foto da obra">
    </div>` : ''}
    <button class="btn-secondary" onclick="voltarPasso()">← CORRIGIR ETAPA ANTERIOR</button>
  `;
}

// ===================== ENVIAR REGISTRO =====================
async function enviarRegistro() {
  const ativLabel = ATIVIDADES.find(a => a.key === state.atividade)?.label
    || state.atividadeCustom || state.atividade || 'Não informado';
  const catLabel = CATEGORIAS.find(c => c.key === state.categoriaProblema)?.nome || '';

  const dadosRegistro = {
    id_obra: state.obraAtual.id_obra,
    descricao_atividade: ativLabel,
    problemas: state.temProblema
      ? `${catLabel}${state.descricaoProblema ? ' — ' + state.descricaoProblema : ''}`
      : '',
    medicoes: state.medicao + ' m²',
    criado_por: state.criado_por
  };

  if (!navigator.onLine) {
    Storage.addToQueue({ ...dadosRegistro, _foto: state.foto });
    atualizarContadores();
    mostrarAviso('💾 Salvo no celular! Será enviado quando tiver sinal.', 'warning');
    setTimeout(voltarHome, 2500);
    return;
  }

  mostrarLoading('Enviando registro...');
  try {
    const registro = await API.criarRegistro(dadosRegistro);

    if (state.foto && registro?.id_registro) {
      const elTxt = $('loading-text');
      if (elTxt) elTxt.textContent = 'Enviando foto...';
      await API.uploadFoto(registro.id_registro, state.foto);
    }

    esconderLoading();
    mostrarAviso('✅ Registro enviado com sucesso!', 'success');
    setTimeout(voltarHome, 2200);

  } catch (e) {
    esconderLoading();
    Storage.addToQueue({ ...dadosRegistro, _foto: state.foto });
    atualizarContadores();
    mostrarAviso('⚠️ Falha na rede. Salvo localmente, será enviado depois.', 'warning');
    setTimeout(voltarHome, 2500);
  }
}

// ===================== SYNC AO VOLTAR ONLINE =====================
function configurarSyncOnline() {
  window.addEventListener('online', async () => {
    atualizarConexao();
    const fila = Storage.getQueue();
    if (fila.length === 0) return;
    mostrarAviso(`📡 Enviando ${fila.length} registro(s) pendente(s)...`, 'warning');
    let enviados = 0;
    for (const item of [...fila]) {
      try {
        const foto  = item._foto;
        const dados = { ...item };
        delete dados._foto; delete dados.id_local; delete dados.created_at;
        const reg = await API.criarRegistro(dados);
        if (foto && reg?.id_registro) await API.uploadFoto(reg.id_registro, foto);
        Storage.removeFromQueue(item.id_local);
        enviados++;
      } catch { break; }
    }
    atualizarContadores();
    if (enviados > 0) mostrarAviso(`✅ ${enviados} registro(s) enviado(s)!`, 'success');
  });
}

// ===================== HELPERS =====================
function mostrarLoading(msg = 'Aguarde...') {
  const el = $('loading-text');
  if (el) el.textContent = msg;
  const ov = $('loading-overlay');
  if (ov) ov.classList.add('show');
}

function esconderLoading() {
  const ov = $('loading-overlay');
  if (ov) ov.classList.remove('show');
}

let _toastTimer;
function mostrarAviso(msg, tipo = '') {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + tipo;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'toast'; }, 3500);
}

function safe(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Globais necessários
window.voltarHome         = voltarHome;
window.atualizarBotaoNext = atualizarBotaoNext;
window.state              = state;
window.showToast          = mostrarAviso; // alias