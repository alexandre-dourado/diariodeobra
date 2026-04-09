// app.js — lógica principal do Diário de Obra

// ===================== ESTADO GLOBAL =====================
const state = {
  obras: [],
  obraAtual: null,
  step: 1,
  totalSteps: 5,
  foto: null,         // base64
  atividade: null,
  atividadeCustom: '',
  temProblema: false,
  categoriaProblema: '',
  descricaoProblema: '',
  medicao: '',
  criado_por: 'Engenheiro de Campo'
};

// ===================== ELEMENTOS =====================
const elHome = () => document.getElementById('screen-home');
const elSteps = () => document.getElementById('screen-steps');
const elObrasContainer = () => document.getElementById('obras-list');
const elLoadingOverlay = () => document.getElementById('loading-overlay');
const elLoadingText = () => document.getElementById('loading-text');
const elToast = () => document.getElementById('toast');
const elProgressFill = () => document.getElementById('progress-fill');
const elStepLabel = () => document.getElementById('step-label');
const elStepPct = () => document.getElementById('step-pct');
const elStepTitle = () => document.getElementById('step-title');
const elStepBody = () => document.getElementById('step-body');
const elBtnNext = () => document.getElementById('btn-next');
const elBtnBack = () => document.getElementById('btn-back-step');
const elObraBannerName = () => document.getElementById('obra-banner-name');
const elObraBannerId = () => document.getElementById('obra-banner-id');
const elSearchInput = () => document.getElementById('search-input');
const elStatObras = () => document.getElementById('stat-obras');
const elStatPending = () => document.getElementById('stat-pending');
const elOnlineBadge = () => document.getElementById('online-badge');

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  registerSW();
  updateOnlineBadge();
  window.addEventListener('online', updateOnlineBadge);
  window.addEventListener('offline', updateOnlineBadge);
  await carregarObras();
  setupSearch();
  setupOnlineSync();
});

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }
}

function updateOnlineBadge() {
  const el = elOnlineBadge();
  if (!el) return;
  if (navigator.onLine) {
    el.textContent = 'ONLINE';
    el.className = 'badge-online online';
  } else {
    el.textContent = 'OFFLINE';
    el.className = 'badge-online offline';
  }
}

// ===================== CARREGAR OBRAS =====================
async function carregarObras() {
  showLoading('Carregando obras...');
  try {
    let obras;
    if (navigator.onLine) {
      obras = await API.listarObras();
      Storage.saveObras(obras);
    } else {
      obras = Storage.getObras();
    }
    state.obras = obras || [];
    renderObras(state.obras);
    updateStats();
  } catch (e) {
    state.obras = Storage.getObras();
    renderObras(state.obras);
    updateStats();
    if (state.obras.length === 0) {
      showToast('Sem conexão — nenhuma obra em cache', 'warning');
    }
  } finally {
    hideLoading();
  }
}

function updateStats() {
  if (elStatObras()) elStatObras().textContent = String(state.obras.length).padStart(2, '0');
  const queue = Storage.getQueue();
  if (elStatPending()) elStatPending().textContent = String(queue.length).padStart(2, '0');
}

function renderObras(obras) {
  const container = elObrasContainer();
  if (!container) return;
  if (!obras || obras.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🏗️</div>
        <div class="msg">Nenhuma obra encontrada</div>
      </div>`;
    return;
  }
  container.innerHTML = obras.map((obra, i) => {
    const id = obra.id_obra || obra['id_obra'] || '';
    const nome = obra.nome || 'Obra sem nome';
    const empresa = obra.empresa || '';
    const badges = ['badge-progress', 'badge-pending', 'badge-logged'];
    const badgeLabels = ['IN PROGRESS', 'PENDING LOG', 'LOGGED'];
    const bi = i % 3;
    return `
    <div class="obra-card" onclick="selecionarObra('${id}', '${escHtml(nome)}')">
      <div style="position:relative">
        <div class="obra-card-img-placeholder">🏗️</div>
        <div class="obra-card-badge ${badges[bi]}">${badgeLabels[bi]}</div>
      </div>
      <div class="obra-card-body">
        <div class="obra-card-id">ID: #${id.slice(0,8).toUpperCase()}</div>
        <div class="obra-card-name">${escHtml(nome)}</div>
        <div class="obra-card-manager">👷 ${escHtml(empresa)}</div>
      </div>
    </div>`;
  }).join('');
}

function setupSearch() {
  const inp = elSearchInput();
  if (!inp) return;
  inp.addEventListener('input', () => {
    const q = inp.value.toLowerCase();
    const filtradas = state.obras.filter(o =>
      (o.nome || '').toLowerCase().includes(q) ||
      (o.empresa || '').toLowerCase().includes(q)
    );
    renderObras(filtradas);
  });
}

// ===================== SELECIONAR OBRA =====================
window.selecionarObra = function(id, nome) {
  state.obraAtual = state.obras.find(o => o.id_obra === id) || { id_obra: id, nome };
  iniciarFluxo();
};

// ===================== FLUXO DE REGISTRO =====================
function iniciarFluxo() {
  state.step = 1;
  state.foto = null;
  state.atividade = null;
  state.atividadeCustom = '';
  state.temProblema = false;
  state.categoriaProblema = '';
  state.descricaoProblema = '';
  state.medicao = '';

  elHome().style.display = 'none';
  elSteps().style.display = 'block';

  // Banner da obra
  if (elObraBannerName()) elObraBannerName().textContent = state.obraAtual.nome;
  if (elObraBannerId()) elObraBannerId().textContent = 'ID: ' + (state.obraAtual.id_obra || '').slice(0,8).toUpperCase();

  renderStep();
}

function voltarHome() {
  elSteps().style.display = 'none';
  elHome().style.display = 'block';
  updateStats();
}

function renderStep() {
  const s = state.step;
  const pct = Math.round((s / state.totalSteps) * 100);

  if (elProgressFill()) elProgressFill().style.width = pct + '%';
  if (elStepPct()) elStepPct().textContent = pct + '%';
  if (elStepLabel()) elStepLabel().textContent = `PASSO ${s} DE ${state.totalSteps}`;

  const titles = ['', 'FOTO DA OBRA', 'ATIVIDADE', 'TEVE PROBLEMA?', 'MEDIÇÃO', 'RESUMO'];
  if (elStepTitle()) elStepTitle().innerHTML = `PASSO ${s}: ${titles[s]}<span></span>`;

  const body = elStepBody();
  if (!body) return;

  switch (s) {
    case 1: body.innerHTML = renderStep1(); setupStep1(); break;
    case 2: body.innerHTML = renderStep2(); setupStep2(); break;
    case 3: body.innerHTML = renderStep3(); setupStep3(); break;
    case 4: body.innerHTML = renderStep4(); setupStep4(); break;
    case 5: body.innerHTML = renderStep5(); break;
  }

  updateNextBtn();
}

function updateNextBtn() {
  const btn = elBtnNext();
  if (!btn) return;
  const s = state.step;
  if (s === state.totalSteps) {
    btn.textContent = '✔ SALVAR REGISTRO';
    btn.classList.add('dark');
    btn.disabled = false;
  } else {
    btn.innerHTML = 'AVANÇAR →';
    btn.classList.remove('dark');
    btn.disabled = !canProceed();
  }
}

function canProceed() {
  switch (state.step) {
    case 1: return !!state.foto;
    case 2: return !!state.atividade;
    case 3: return true;
    case 4: return !!(state.medicao && parseFloat(state.medicao) >= 0);
    case 5: return true;
    default: return true;
  }
}

window.avancar = async function() {
  if (!canProceed()) return;
  if (state.step === state.totalSteps) {
    await salvarRegistro();
    return;
  }
  state.step++;
  renderStep();
};

window.voltarPasso = function() {
  if (state.step === 1) { voltarHome(); return; }
  state.step--;
  renderStep();
};

// ===================== PASSO 1 — FOTO =====================
function renderStep1() {
  return `
    <div class="photo-zone ${state.foto ? 'has-photo' : ''}" id="photo-zone">
      ${state.foto ? `<img src="${state.foto}" alt="Foto da obra">` : ''}
      <div class="photo-zone-placeholder">
        <div class="icon">📷</div>
        <div class="text">NENHUMA IMAGEM<br>CAPTURADA</div>
      </div>
    </div>
    <button class="btn-primary" onclick="abrirCamera()">📷 ABRIR CÂMERA</button>
    <input type="file" id="file-input" accept="image/*" capture="environment" style="display:none" onchange="handleFoto(this)">
    ${!state.foto ? `
    <div class="field-alert">
      <div class="alert-icon">⚠️</div>
      <div class="alert-text">A foto é obrigatória para continuar o registro diário. Certifique-se de que a iluminação esteja adequada.</div>
    </div>` : `
    <div class="field-tip">
      <div class="alert-icon">✅</div>
      <div class="alert-text">Foto capturada! Clique em AVANÇAR para continuar.</div>
    </div>`}
  `;
}

function setupStep1() {}

window.abrirCamera = function() {
  const inp = document.getElementById('file-input');
  if (inp) inp.click();
};

window.handleFoto = function(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    state.foto = e.target.result;
    renderStep();
  };
  reader.readAsDataURL(file);
};

// ===================== PASSO 2 — ATIVIDADE =====================
const ATIVIDADES = [
  { key: 'concretagem',  label: 'CONCRETAGEM', icon: '🏗️' },
  { key: 'alvenaria',    label: 'ALVENARIA',   icon: '🧱' },
  { key: 'eletrica',     label: 'ELÉTRICA',    icon: '⚡' },
  { key: 'hidraulica',   label: 'HIDRÁULICA',  icon: '🔧' }
];

function renderStep2() {
  return `
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
    <div class="atividade-outro" onclick="selecionarAtividade('outro')">
      <div class="label ${state.atividade === 'outro' ? '' : ''}">
        <span>• • •</span> OUTRO
      </div>
      <span>›</span>
    </div>
    ${state.atividade === 'outro' ? `
    <input type="text" id="outro-input" class="search-input" style="margin-top:10px"
           placeholder="Descreva a atividade..." value="${escHtml(state.atividadeCustom)}"
           oninput="state.atividadeCustom = this.value; updateNextBtn()">
    ` : ''}
    <div class="field-tip" style="margin-top:16px">
      <div>
        <div class="tip-label">AVISO DE CAMPO</div>
        <div class="alert-text">A seleção da atividade principal habilita formulários específicos de inspeção.</div>
      </div>
    </div>
  `;
}

function setupStep2() {}

window.selecionarAtividade = function(key) {
  state.atividade = key;
  renderStep();
  if (key === 'outro') {
    setTimeout(() => {
      const inp = document.getElementById('outro-input');
      if (inp) inp.focus();
    }, 50);
  }
};

// ===================== PASSO 3 — PROBLEMA =====================
const CATEGORIAS = [
  { key: 'atraso',    nome: 'ATRASO',           sub: 'CRONOGRAMA',  icon: '🕐' },
  { key: 'material',  nome: 'FALTA DE MATERIAL', sub: 'SUPRIMENTOS', icon: '📦' },
  { key: 'outro',     nome: 'OUTRO',             sub: 'DIVERSOS',    icon: '•••' }
];

function renderStep3() {
  return `
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
      <div class="categoria-label">SELECIONE A CATEGORIA</div>
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
                placeholder="Descreva o problema (opcional)..."
                oninput="state.descricaoProblema = this.value">${escHtml(state.descricaoProblema)}</textarea>
    ` : ''}
  `;
}

function setupStep3() {}

window.definirProblema = function(sim) {
  state.temProblema = sim;
  if (!sim) { state.categoriaProblema = ''; state.descricaoProblema = ''; }
  renderStep();
};

window.selecionarCategoria = function(key) {
  state.categoriaProblema = key;
  renderStep();
};

// ===================== PASSO 4 — MEDIÇÃO =====================
const CHIPS = [10, 20, 50];

function renderStep4() {
  return `
    <p style="font-size:0.9rem;color:var(--grey-mid);margin-bottom:16px">
      Informe a metragem executada hoje no setor.
    </p>
    <div class="medicao-chips">
      ${CHIPS.map(v => `
        <button class="chip-btn ${state.medicao == v ? 'selected' : ''}"
                onclick="selecionarChip(${v})">
          <div class="chip-val">${v}</div>
          <div class="chip-unit">M²</div>
        </button>
      `).join('')}
    </div>
    <div class="medicao-manual-label">ENTRADA MANUAL (M²)</div>
    <div class="medicao-input-wrap">
      <input type="number" class="medicao-input" id="medicao-input"
             value="${state.medicao}" placeholder="0.00"
             oninput="state.medicao = this.value; clearChips(); updateNextBtn()">
      <span style="font-size:1.2rem;color:var(--grey-mid)">📐</span>
    </div>
    <div class="field-tip">
      <div>
        <div class="tip-label">DICA DE CAMPO</div>
        <div class="alert-text">Certifique-se de que a área está limpa antes da medição final para evitar discrepâncias no log diário.</div>
      </div>
    </div>
  `;
}

function setupStep4() {}

window.selecionarChip = function(v) {
  state.medicao = String(v);
  renderStep();
};

window.clearChips = function() {
  // chips visuais atualizam no próximo render — sem re-render para não perder foco
};

// ===================== PASSO 5 — RESUMO =====================
function renderStep5() {
  const ativLabel = ATIVIDADES.find(a => a.key === state.atividade)?.label ||
    (state.atividade === 'outro' ? state.atividadeCustom : state.atividade) || '—';
  const catLabel = CATEGORIAS.find(c => c.key === state.categoriaProblema)?.nome || '—';

  return `
    <p style="font-family:var(--font-display);font-size:0.65rem;font-weight:600;
       letter-spacing:0.12em;text-transform:uppercase;color:var(--grey-mid);margin-bottom:16px">
      CONFIRME AS INFORMAÇÕES ANTES DE FINALIZAR
    </p>
    <div class="resumo-card">
      <div class="resumo-row">
        <div class="resumo-sublabel">OBRA</div>
        <div class="resumo-value">${escHtml(state.obraAtual?.nome || '—')}</div>
      </div>
      <div class="resumo-row">
        <div class="resumo-sublabel">ATIVIDADE</div>
        <div class="resumo-value">${escHtml(ativLabel)}</div>
      </div>
      <div class="resumo-row">
        <div class="resumo-sublabel">MEDIÇÃO DIÁRIA</div>
        <div class="resumo-value big">${state.medicao || '0'} m²</div>
      </div>
    </div>
    ${state.temProblema ? `
    <div class="resumo-problema-card">
      <div class="rp-icon">❗</div>
      <div>
        <div class="rp-title">OCORRÊNCIAS / PROBLEMAS</div>
        <div class="rp-text">${escHtml(catLabel)}${state.descricaoProblema ? ' — ' + state.descricaoProblema : ''}</div>
      </div>
    </div>` : ''}
    ${state.foto ? `
    <div class="media-section-label">MÍDIA ANEXADA</div>
    <div class="media-grid">
      <img class="media-thumb" src="${state.foto}" alt="Foto da obra">
    </div>` : ''}
    <button class="btn-secondary" onclick="voltarPasso()">← REVISAR ETAPAS ANTERIORES</button>
  `;
}

// ===================== SALVAR REGISTRO =====================
async function salvarRegistro() {
  const ativLabel = ATIVIDADES.find(a => a.key === state.atividade)?.label ||
    state.atividadeCustom || state.atividade || 'Não informada';
  const catLabel = CATEGORIAS.find(c => c.key === state.categoriaProblema)?.nome || '';

  const dadosRegistro = {
    id_obra: state.obraAtual.id_obra,
    descricao_atividade: ativLabel,
    problemas: state.temProblema ? `${catLabel} — ${state.descricaoProblema}` : '',
    medicoes: state.medicao + ' m²',
    criado_por: state.criado_por
  };

  if (!navigator.onLine) {
    // Salvar na fila offline
    Storage.addToQueue({ ...dadosRegistro, _foto: state.foto });
    updateStats();
    showToast('Salvo offline — será enviado quando conectar', 'warning');
    setTimeout(voltarHome, 2000);
    return;
  }

  showLoading('Enviando registro...');
  try {
    const registro = await API.criarRegistro(dadosRegistro);
    if (state.foto && registro.id_registro) {
      elLoadingText().textContent = 'Enviando foto...';
      await API.uploadFoto(registro.id_registro, state.foto);
    }
    hideLoading();
    showToast('Registro salvo com sucesso! ✓', 'success');
    setTimeout(voltarHome, 2200);
  } catch (e) {
    hideLoading();
    // fallback offline
    Storage.addToQueue({ ...dadosRegistro, _foto: state.foto });
    updateStats();
    showToast('Erro de rede — salvo offline', 'warning');
    setTimeout(voltarHome, 2200);
  }
}

// ===================== SYNC ONLINE =====================
function setupOnlineSync() {
  window.addEventListener('online', async () => {
    updateOnlineBadge();
    const queue = Storage.getQueue();
    if (queue.length === 0) return;
    showToast(`Sincronizando ${queue.length} registro(s)...`, 'warning');
    let synced = 0;
    for (const item of [...queue]) {
      try {
        const foto = item._foto;
        const dados = { ...item };
        delete dados._foto;
        delete dados.id_local;
        delete dados.created_at;
        const reg = await API.criarRegistro(dados);
        if (foto && reg.id_registro) {
          await API.uploadFoto(reg.id_registro, foto);
        }
        Storage.removeFromQueue(item.id_local);
        synced++;
      } catch { break; }
    }
    updateStats();
    if (synced > 0) showToast(`${synced} registro(s) sincronizado(s) ✓`, 'success');
  });
}

// ===================== UTILS =====================
function showLoading(msg = 'Carregando...') {
  const overlay = elLoadingOverlay();
  if (elLoadingText()) elLoadingText().textContent = msg;
  if (overlay) overlay.classList.add('show');
}
function hideLoading() {
  const overlay = elLoadingOverlay();
  if (overlay) overlay.classList.remove('show');
}

let toastTimer;
function showToast(msg, type = '') {
  const el = elToast();
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3000);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Expõe para HTML
window.voltarHome = voltarHome;
window.updateNextBtn = updateNextBtn;
window.state = state;
