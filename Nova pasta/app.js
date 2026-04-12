// app.js — Simulação do Fluxo do Diário de Obra

// --- DADOS FALSOS PARA A SIMULAÇÃO ---
const obrasSimuladas = [
  { id: 'OBR-2026-A', nome: 'Edifício Central', status: 'em andamento' },
  { id: 'OBR-2026-B', nome: 'Ponte Sul', status: 'pendente' }
];

let passoAtual = 1;
const totalPassos = 5;

// --- ELEMENTOS DA TELA ---
const screenHome = document.getElementById('screen-home');
const screenSteps = document.getElementById('screen-steps');
const btnNext = document.getElementById('btn-next');
const stepBody = document.getElementById('step-body');
const stepPct = document.getElementById('step-pct');
const progressFill = document.getElementById('progress-fill');
const stepLabel = document.getElementById('step-label');
const stepTitle = document.getElementById('step-title');

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  // Simula um tempo de carregamento
  setTimeout(() => {
    document.getElementById('loading-overlay').classList.remove('show');
    carregarHome();
  }, 800);

  // Configura o botão gigante da Home
  document.getElementById('btn-registrar-home').addEventListener('click', () => {
    iniciarFluxo(obrasSimuladas[0]); // Puxa a primeira obra como atalho
  });
});

// --- FUNÇÕES DA HOME ---
function carregarHome() {
  document.getElementById('stat-obras').textContent = '02';
  const list = document.getElementById('obras-list');
  list.innerHTML = ''; // Limpa o "Carregando..."

  obrasSimuladas.forEach(obra => {
    const card = document.createElement('div');
    card.className = 'obra-card';
    card.innerHTML = `
      <div class="obra-card-body">
        <div class="obra-card-id">${obra.id}</div>
        <div class="obra-card-name">${obra.nome}</div>
        <div class="obra-card-manager">👤 Resp: Alexandre</div>
        <div class="obra-card-action">CLIQUE PARA REGISTRAR →</div>
      </div>
    `;
    card.addEventListener('click', () => iniciarFluxo(obra));
    list.appendChild(card);
  });
}

// --- FUNÇÕES DO FLUXO (STEPS) ---
function iniciarFluxo(obra) {
  // Transição de tela
  screenHome.style.display = 'none';
  screenSteps.style.display = 'block';
  window.scrollTo(0, 0);

  // Preenche o cabeçalho da obra
  document.getElementById('obra-banner-name').textContent = obra.nome;
  document.getElementById('obra-banner-id').textContent = obra.id;

  passoAtual = 1;
  renderizarPasso();
}

function voltarPasso() {
  if (passoAtual > 1) {
    passoAtual--;
    renderizarPasso();
  } else {
    // Volta pra Home
    screenSteps.style.display = 'none';
    screenHome.style.display = 'block';
  }
}

function avancar() {
  if (passoAtual < totalPassos) {
    passoAtual++;
    renderizarPasso();
  } else {
    finalizarRegistro();
  }
}

function renderizarPasso() {
  // Atualiza UI de Progresso
  const pct = (passoAtual / totalPassos) * 100;
  stepPct.textContent = `${pct}%`;
  progressFill.style.width = `${pct}%`;
  stepLabel.textContent = `ETAPA ${passoAtual} DE ${totalPassos}`;
  window.scrollTo(0, 0);

  // Desabilita botão até "preencher" algo (simulado)
  btnNext.disabled = false; 

  // Injeta o HTML dependendo do passo
  switch (passoAtual) {
    case 1:
      stepTitle.innerHTML = 'FOTO DA OBRA<span></span>';
      stepBody.innerHTML = `
        <div class="step-hint">Tire uma foto geral que mostre o andamento atual do canteiro.</div>
        <div class="photo-zone" onclick="simularTirarFoto(this)">
          <div class="photo-zone-placeholder">
            <div class="icon">📷</div>
            <div class="text">TOQUE PARA CAPTURAR</div>
          </div>
        </div>
      `;
      btnNext.textContent = 'CONTINUAR →';
      break;
    case 2:
      stepTitle.innerHTML = 'ATIVIDADES<span></span>';
      stepBody.innerHTML = `
        <div class="step-hint">Selecione o que foi feito hoje.</div>
        <div class="atividade-grid">
          <div class="atividade-btn" onclick="this.classList.toggle('selected')">
            <div class="check">✓</div>
            <div class="icon">🧱</div>
            <div class="label">Alvenaria</div>
          </div>
          <div class="atividade-btn" onclick="this.classList.toggle('selected')">
            <div class="check">✓</div>
            <div class="icon">⚡</div>
            <div class="label">Elétrica</div>
          </div>
        </div>
      `;
      break;
    case 3:
      stepTitle.innerHTML = 'PROBLEMAS<span></span>';
      stepBody.innerHTML = `
        <div class="step-hint">Houve algum impedimento grave?</div>
        <div class="sim-nao-grid">
          <div class="sn-btn selected-sim" onclick="alert('Funcionalidade simulada!')">
            <div class="sn-icon">👍</div>
            <div class="sn-label">NÃO</div>
          </div>
          <div class="sn-btn" onclick="alert('Funcionalidade simulada!')">
            <div class="sn-icon">⚠️</div>
            <div class="sn-label">SIM</div>
          </div>
        </div>
      `;
      break;
    case 4:
      stepTitle.innerHTML = 'CLIMA<span></span>';
      stepBody.innerHTML = `
        <div class="step-hint">Como estava o tempo?</div>
        <div class="medicao-chips">
          <div class="chip-btn selected">
            <div class="chip-val">☀️</div>
            <div class="chip-unit">BOM</div>
          </div>
          <div class="chip-btn">
            <div class="chip-val">🌧️</div>
            <div class="chip-unit">CHUVA</div>
          </div>
        </div>
      `;
      break;
    case 5:
      stepTitle.innerHTML = 'RESUMO<span></span>';
      stepBody.innerHTML = `
        <div class="resumo-card">
          <div class="resumo-row">
            <div class="resumo-sublabel">STATUS GERAL</div>
            <div class="resumo-value">Dia produtivo, sem interrupções.</div>
          </div>
        </div>
      `;
      btnNext.textContent = 'ENVIAR REGISTRO ✓';
      break;
  }
}

function simularTirarFoto(elemento) {
  elemento.classList.add('has-photo');
  elemento.style.background = '#333';
  elemento.innerHTML = '<div style="color:var(--yellow); font-family:var(--font-display); padding: 20px;">[ FOTO CAPTURADA ]</div>';
}

function finalizarRegistro() {
  document.getElementById('loading-overlay').classList.add('show');
  document.getElementById('loading-text').textContent = 'SALVANDO...';
  
  setTimeout(() => {
    document.getElementById('loading-overlay').classList.remove('show');
    screenSteps.style.display = 'none';
    screenHome.style.display = 'block';
    
    // Mostra o Toast de sucesso
    const toast = document.getElementById('toast');
    toast.textContent = 'REGISTRO SALVO COM SUCESSO!';
    toast.className = 'toast success show';
    setTimeout(() => toast.classList.remove('show'), 3000);
    
    // Atualiza estatística fake
    document.getElementById('stat-pending').textContent = '01';
  }, 1500);
}