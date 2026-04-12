// Estado global para armazenar dados carregados
let state = {
    obras: [],
    registros: [],
    aditivos: [],
    notificacoes: []
};

// ==========================================
// 1. NAVEGAÇÃO E UI (SPA)
// ==========================================

function navigateTo(viewId) {
    // Esconde todas as sections
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    // Remove active da sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
    
    // Mostra a selecionada
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    // Marca o botão como ativo
    const btn = document.querySelector(`.nav-item[data-target="${viewId}"]`);
    if(btn) btn.classList.add('active');
    
    // Atualiza o Título
    document.getElementById('page-title').innerText = btn ? btn.innerText.trim() : 'Painel';

    // Dispara carregamento específico se necessário
    if(viewId === 'dashboard') initDashboard();
    if(viewId === 'obras') carregarObras();
    if(viewId === 'aditivos') carregarAditivos();
    if(viewId === 'notificacoes') carregarNotificacoes();
    if(viewId === 'registros') carregarRegistros();
}

function showLoading(show) {
    const el = document.getElementById('loading-overlay');
    show ? el.classList.remove('hidden') : el.classList.add('hidden');
}

// ==========================================
// 2. DASHBOARD
// ==========================================

async function initDashboard() {
    showLoading(true);
    // Carrega dados se ainda não existirem
    if(state.obras.length === 0) state.obras = await API.listar('listarObras');
    if(state.aditivos.length === 0) state.aditivos = await API.listar('listarAditivos');
    if(state.notificacoes.length === 0) state.notificacoes = await API.listar('listarNotificacoes');

    // Cálculos
    const totalObras = state.obras.length;
    
    let somaExecucao = 0;
    state.obras.forEach(o => somaExecucao += parseFloat(o.percentual_execucao || 0));
    const mediaExecucao = totalObras > 0 ? (somaExecucao / totalObras).toFixed(1) : 0;

    const aditivosAnalise = state.aditivos.filter(a => a.status === 'em análise').length;
    
    // Filtra notificações do mês atual (simplificado)
    const mesAtual = new Date().getMonth();
    const notifsMes = state.notificacoes.filter(n => {
        if(!n.data_notificacao) return false;
        const d = new Date(n.data_notificacao);
        return d.getMonth() === mesAtual;
    }).length;

    // Atualiza UI
    document.getElementById('dash-total-obras').innerText = totalObras;
    document.getElementById('dash-media-execucao').innerText = `${mediaExecucao}%`;
    document.getElementById('dash-total-aditivos').innerText = aditivosAnalise;
    document.getElementById('dash-total-notificacoes').innerText = notifsMes;

    showLoading(false);
}

// ==========================================
// 3. GESTÃO DE OBRAS
// ==========================================

async function carregarObras() {
    showLoading(true);
    state.obras = await API.listar('listarObras');
    
    const tbody = document.querySelector('#tabela-obras tbody');
    tbody.innerHTML = '';

    state.obras.forEach(obra => {
        const perc = obra.percentual_execucao || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><small>${obra.id_obra.substring(0,8)}...</small></td>
            <td><strong>${obra.nome}</strong></td>
            <td>${obra.empresa}</td>
            <td>
                <input type="number" value="${perc}" min="0" max="100" style="width: 60px; padding:4px;"> %
                <button onclick="salvarPercentual('${obra.id_obra}', this)" style="padding:4px 8px; margin-left:5px;">Salvar</button>
            </td>
            <td>
                ${obra.link_cronograma ? `<a href="${obra.link_cronograma}" target="_blank" class="btn-primary" style="text-decoration:none; padding: 4px 8px; font-size:0.8rem;">Cronograma</a>` : 'S/ Cronog.'}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Atualiza filtros dropdown noutras telas
    atualizarDropdownObras();
    showLoading(false);
}

async function salvarPercentual(idObra, btnElement) {
    const input = btnElement.previousElementSibling;
    const novoValor = parseFloat(input.value);

    btnElement.innerText = "...";
    btnElement.disabled = true;

    const res = await API.enviar('atualizarPercentualObra', {
        id_obra: idObra,
        percentual_execucao: novoValor
    });

    if(res) {
        btnElement.innerText = "Ok!";
        setTimeout(() => { btnElement.innerText = "Salvar"; btnElement.disabled = false; }, 2000);
    } else {
        btnElement.innerText = "Erro";
        btnElement.disabled = false;
    }
}

function atualizarDropdownObras() {
    const dropdowns = [document.getElementById('filtro-obra-registros')];
    dropdowns.forEach(select => {
        if(!select) return;
        // Guarda opção atual para não perder filtro
        const valAtual = select.value;
        select.innerHTML = '<option value="">Todas as Obras</option>';
        state.obras.forEach(o => {
            select.innerHTML += `<option value="${o.id_obra}">${o.nome}</option>`;
        });
        select.value = valAtual;
    });
}

// ==========================================
// 4. ADITIVOS
// ==========================================

async function carregarAditivos() {
    showLoading(true);
    state.aditivos = await API.listar('listarAditivos');
    // Mapeamento auxiliar para exibir o nome da obra ao invés do ID
    if(state.obras.length === 0) state.obras = await API.listar('listarObras');
    
    const tbody = document.querySelector('#tabela-aditivos tbody');
    tbody.innerHTML = '';

    state.aditivos.forEach(ad => {
        const obra = state.obras.find(o => o.id_obra === ad.id_obra);
        const nomeObra = obra ? obra.nome : 'Desconhecida';
        
        let statusClass = 'badge ';
        if(ad.status === 'em análise') statusClass += 'em-analise';
        else if(ad.status === 'aprovado') statusClass += 'aprovado';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ad.data_solicitacao ? ad.data_solicitacao.substring(0,10) : '-'}</td>
            <td>${nomeObra}</td>
            <td style="text-transform: capitalize;">${ad.tipo}</td>
            <td>${ad.descricao}</td>
            <td><span class="${statusClass}">${ad.status}</span></td>
            <td>
                <select onchange="mudarStatusAditivo('${ad.id_aditivo}', this.value)">
                    <option value="em análise" ${ad.status==='em análise'?'selected':''}>Análise</option>
                    <option value="aprovado" ${ad.status==='aprovado'?'selected':''}>Aprovar</option>
                    <option value="negado" ${ad.status==='negado'?'selected':''}>Negar</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
    showLoading(false);
}

// Simulação de alteração de status (Exigiria endpoint 'atualizarAditivo' no Apps Script)
function mudarStatusAditivo(idAditivo, novoStatus) {
    alert("Função de alteração de status configurada. Requer endpoint no backend.");
    // Exemplo: API.enviar('atualizarStatusAditivo', { id: idAditivo, status: novoStatus });
}

function abrirModalAditivo() {
    // Para manter simples, usando prompt/alert nesta versão sem modais complexos
    alert("Interface para criar novo aditivo em desenvolvimento.");
}

// ==========================================
// 5. NOTIFICAÇÕES
// ==========================================

async function carregarNotificacoes() {
    showLoading(true);
    state.notificacoes = await API.listar('listarNotificacoes');
    if(state.obras.length === 0) state.obras = await API.listar('listarObras');
    
    const tbody = document.querySelector('#tabela-notificacoes tbody');
    tbody.innerHTML = '';

    state.notificacoes.forEach(n => {
        const obra = state.obras.find(o => o.id_obra === n.id_obra);
        const nomeObra = obra ? obra.nome : 'Desconhecida';
        const isReincidente = (n.reincidente === 'SIM' || n.reincidente === true);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${n.data_notificacao ? n.data_notificacao.substring(0,10) : '-'}</td>
            <td>${nomeObra}</td>
            <td><strong>${n.assunto}</strong></td>
            <td>${isReincidente ? '<span class="badge reincidente">Sim</span>' : 'Não'}</td>
            <td><small>${n.descricao}</small></td>
        `;
        tbody.appendChild(tr);
    });
    showLoading(false);
}

function abrirModalNotificacao() {
    alert("Interface para criar notificação em desenvolvimento.");
}

// ==========================================
// 6. REGISTROS (DIÁRIO DE OBRA)
// ==========================================

async function carregarRegistros() {
    showLoading(true);
    if(state.registros.length === 0) {
        state.registros = await API.listar('listarRegistros');
    }
    
    const filtroObra = document.getElementById('filtro-obra-registros').value;
    const filtroData = document.getElementById('filtro-data-registros').value;
    const container = document.getElementById('lista-registros');
    
    container.innerHTML = '';

    // Aplica Filtros
    let regs = state.registros;
    if(filtroObra) regs = regs.filter(r => r.id_obra === filtroObra);
    if(filtroData) regs = regs.filter(r => r.data && r.data.includes(filtroData));

    if(regs.length === 0) {
        container.innerHTML = '<p>Nenhum registro encontrado para os filtros selecionados.</p>';
        showLoading(false);
        return;
    }

    // Renderiza Cards
    regs.forEach(reg => {
        // Encontra o nome da obra (cache)
        const obra = state.obras.find(o => o.id_obra === reg.id_obra);
        const nomeObra = obra ? obra.nome : 'Obra Não Identificada';
        
        let climaText = "Não informado";
        if(reg.clima_condicao) climaText = `${reg.clima_condicao} (${reg.clima_observacao || 'Sem obs'})`;

        let trabalhadoresHtml = "";
        try {
            const trabs = JSON.parse(reg.trabalhadores_json || "[]");
            trabs.forEach(t => trabalhadoresHtml += `<li>${t.nome} - <i>${t.funcao}</i></li>`);
        } catch(e) {}

        const div = document.createElement('div');
        div.className = 'registro-card';
        div.innerHTML = `
            <div class="meta">Data: ${reg.data ? reg.data.substring(0,10) : 'N/D'} | Autor: ${reg.criado_por}</div>
            <h4>${nomeObra}</h4>
            <hr style="margin: 10px 0; border:0; border-top:1px solid #eee;">
            <p><strong>Atividade:</strong> ${reg.descricao_atividade}</p>
            <p><strong>Clima:</strong> ${climaText}</p>
            <p><strong>Medição:</strong> ${reg.medicoes || 'N/A'}</p>
            <p><strong>Problemas:</strong> ${reg.problemas || 'Nenhum'}</p>
            ${trabalhadoresHtml ? `<div style="margin-top:10px; font-size:0.85rem;"><strong>Equipe:</strong><ul>${trabalhadoresHtml}</ul></div>` : ''}
        `;
        container.appendChild(div);
    });

    showLoading(false);
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    initDashboard(); // Começa sempre no Dashboard
});

/**
 * GERADOR DE RELATÓRIO DE OBRA (PDF / IMPRESSÃO)
 * Converte dados JSON em um template HTML Brutalista/Swiss Design para impressão A4.
 */

function exportarRelatorioPDF(obra, registrosDoDia, fotosDoDia, dataFiltro) {
    // 1. Processamento de Dados
    let htmlAtividades = '';
    let htmlProblemas = '';
    let htmlFotos = '';
    let totalTrabalhadores = 0;
    let listaEquipe = new Set();
    
    let climaGeral = "Não registrado";

    registrosDoDia.forEach(reg => {
        // Clima (pega o último do dia)
        if (reg.clima_condicao) {
            climaGeral = `${reg.clima_condicao.toUpperCase()} — ${reg.clima_observacao}`;
        }

        // Trabalhadores
        try {
            const equipe = JSON.parse(reg.trabalhadores_json || "[]");
            totalTrabalhadores += equipe.length;
            equipe.forEach(t => listaEquipe.add(`${t.nome} (${t.funcao})`));
        } catch(e) {}

        // Atividades
        htmlAtividades += `
            <div class="activity-block">
                <h4>${reg.descricao_atividade.toUpperCase()}</h4>
                <div class="activity-meta">
                    <span><strong>Medição:</strong> ${reg.medicoes || '-'}</span>
                    <span><strong>Responsável:</strong> ${reg.criado_por}</span>
                </div>
            </div>
        `;

        // Problemas/Ocorrências
        if (reg.problemas && reg.problemas.toUpperCase() !== "NÃO" && reg.problemas.trim() !== "") {
            htmlProblemas += `
                <div class="alert-block">
                    <strong>OCORRÊNCIA:</strong> ${reg.problemas}
                </div>
            `;
        }

        // Fotos
        const fotosDesteRegistro = fotosDoDia.filter(f => f.id_registro === reg.id_registro);
        fotosDesteRegistro.forEach(foto => {
            htmlFotos += `
                <div class="photo-card">
                    <img src="${foto.url_foto}" alt="Foto da Atividade" onload="window.dispatchEvent(new Event('fotoCarregada'))" crossorigin="anonymous">
                    <div class="photo-caption">REGISTRO: ${reg.id_registro.substring(0,8).toUpperCase()}</div>
                </div>
            `;
        });
    });

    if (!htmlProblemas) htmlProblemas = `<div class="info-block">NENHUMA OCORRÊNCIA REGISTRADA NESTE PERÍODO.</div>`;
    if (!htmlFotos) htmlFotos = `<div class="info-block">NENHUMA FOTO ANEXADA.</div>`;

    let htmlEquipe = Array.from(listaEquipe).map(t => `<li>${t}</li>`).join('');
    if (!htmlEquipe) htmlEquipe = "<li>Efetivo não detalhado</li>";

    // 2. Template HTML (Swiss Design / Brutalist / Print)
    const templateHTML = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório - ${obra.nome}</title>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700;900&family=Public+Sans:wght@400;700&display=swap" rel="stylesheet">
            <style>
                /* CSS Print-Specific - Brutalist/Swiss */
                @page { size: A4; margin: 15mm; }
                body { 
                    font-family: 'Public Sans', sans-serif; 
                    color: #000; 
                    background: #fff; 
                    margin: 0; 
                    padding: 0;
                    line-height: 1.4;
                    -webkit-print-color-adjust: exact;
                }
                
                h1, h2, h3, h4 { font-family: 'Space Grotesk', sans-serif; text-transform: uppercase; margin: 0; }
                
                .header { 
                    border-bottom: 6px solid #000; 
                    padding-bottom: 10px; 
                    margin-bottom: 20px; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: flex-end;
                }
                .header h1 { font-size: 2.5rem; font-weight: 900; letter-spacing: -0.05em; line-height: 1; }
                .header-meta { text-align: right; font-size: 0.85rem; font-weight: 700; }
                
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                
                .box { border: 2px solid #000; padding: 15px; }
                .box-title { font-family: 'Space Grotesk', sans-serif; font-size: 0.75rem; font-weight: 900; letter-spacing: 0.1em; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
                
                .data-row { display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; padding: 5px 0; font-size: 0.9rem; }
                .data-row strong { text-transform: uppercase; font-size: 0.75rem; }
                
                .section-title { font-size: 1.5rem; font-weight: 900; background: #000; color: #fff; padding: 5px 15px; margin: 30px 0 15px 0; }
                
                .activity-block { border-left: 4px solid #000; padding-left: 15px; margin-bottom: 15px; page-break-inside: avoid; }
                .activity-block h4 { font-size: 1.1rem; margin-bottom: 5px; }
                .activity-meta { font-size: 0.8rem; color: #333; display: flex; gap: 20px; }
                
                .alert-block { background: #000; color: #fff; padding: 15px; font-weight: bold; margin-bottom: 10px; page-break-inside: avoid; }
                .info-block { border: 2px dashed #000; padding: 15px; text-align: center; font-weight: bold; font-family: 'Space Grotesk', sans-serif; }
                
                .team-list { margin: 0; padding-left: 20px; font-size: 0.85rem; columns: 2; }
                .team-list li { margin-bottom: 4px; }
                
                /* Anexo Fotográfico */
                .page-break { page-break-before: always; }
                .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
                .photo-card { border: 2px solid #000; padding: 5px; page-break-inside: avoid; }
                .photo-card img { width: 100%; height: 250px; object-fit: cover; filter: grayscale(100%) contrast(120%); display: block; }
                .photo-caption { font-family: 'Space Grotesk', sans-serif; font-size: 0.7rem; font-weight: 700; text-align: center; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
                
                .footer { margin-top: 50px; border-top: 2px solid #000; padding-top: 10px; display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: bold; }
                .signature-box { width: 250px; border-top: 2px solid #000; text-align: center; margin-top: 50px; padding-top: 5px; font-size: 0.8rem; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>SITE LOG PRO</h1>
                    <h2>RELATÓRIO DIÁRIO DE OBRA</h2>
                </div>
                <div class="header-meta">
                    DATA: ${dataFiltro.split('-').reverse().join('/')}<br>
                    ID OBRA: #${obra.id_obra.substring(0,8).toUpperCase()}<br>
                    EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}
                </div>
            </div>

            <div class="grid-2">
                <div class="box">
                    <div class="box-title">DADOS DO PROJETO</div>
                    <div class="data-row"><strong>NOME</strong> <span>${obra.nome.toUpperCase()}</span></div>
                    <div class="data-row"><strong>EMPRESA</strong> <span>${obra.empresa.toUpperCase()}</span></div>
                    <div class="data-row"><strong>EXECUÇÃO ATUAL</strong> <span>${obra.percentual_execucao || 0}%</span></div>
                </div>
                <div class="box">
                    <div class="box-title">CONDIÇÕES DE CONTORNO</div>
                    <div class="data-row"><strong>CLIMA</strong> <span>${climaGeral}</span></div>
                    <div class="data-row"><strong>EFETIVO TOTAL</strong> <span>${totalTrabalhadores} HOMENS</span></div>
                </div>
            </div>

            <div class="section-title">ATIVIDADES EXECUTADAS</div>
            ${htmlAtividades}

            <div class="grid-2" style="margin-top: 30px;">
                <div class="box">
                    <div class="box-title">OCORRÊNCIAS / PROBLEMAS</div>
                    ${htmlProblemas}
                </div>
                <div class="box">
                    <div class="box-title">RELAÇÃO DE EFETIVO</div>
                    <ul class="team-list">
                        ${htmlEquipe}
                    </ul>
                </div>
            </div>

            <div class="page-break"></div>
            <div class="header">
                <div>
                    <h1>SITE LOG PRO</h1>
                    <h2>ANEXO FOTOGRÁFICO</h2>
                </div>
                <div class="header-meta">DATA: ${dataFiltro.split('-').reverse().join('/')}</div>
            </div>
            
            <div class="photo-grid">
                ${htmlFotos}
            </div>

            <div style="display: flex; justify-content: center; margin-top: 80px;">
                <div class="signature-box">
                    ASSINATURA DO ENGENHEIRO RESPONSÁVEL
                </div>
            </div>

            <div class="footer">
                <span>GERADO POR SITE LOG PRO AOK SYSTEM</span>
                <span>DOCUMENTO OFICIAL DE ENGENHARIA</span>
            </div>

            <script>
                // Aguarda as imagens carregarem antes de acionar a impressão
                let imagens = document.querySelectorAll('img');
                let carregadas = 0;
                
                if(imagens.length === 0) {
                    window.print();
                } else {
                    window.addEventListener('fotoCarregada', () => {
                        carregadas++;
                        if(carregadas === imagens.length) {
                            setTimeout(() => window.print(), 500);
                        }
                    });
                    // Fallback de segurança de 3 segundos
                    setTimeout(() => window.print(), 3000);
                }
            </script>
        </body>
        </html>
    `;

    // 3. Renderização e Gatilho de Impressão
    const novaJanela = window.open('', '_blank');
    novaJanela.document.write(templateHTML);
    novaJanela.document.close();
}

/**
 * Gatilho para o botão da interface UI
 */
async function gerarRelatorioDaDataSelecionada() {
    const filtroObraId = document.getElementById('filtro-obra-registros').value;
    const filtroData = document.getElementById('filtro-data-registros').value;

    if (!filtroObraId || !filtroData) {
        alert("Selecione uma OBRA e uma DATA específica para gerar o relatório consolidado.");
        return;
    }

    showLoading(true);

    // 1. Puxa os dados atualizados do estado (ou faz fetch se estiver vazio)
    const obraSelecionada = state.obras.find(o => o.id_obra === filtroObraId);
    let registrosDaObra = state.registros.filter(r => r.id_obra === filtroObraId && r.data.includes(filtroData));
    
    // 2. Busca as fotos vinculadas a estes registros específicos
    let fotosDoDia = [];
    if (registrosDaObra.length > 0) {
        // Para eficiência, se as fotos não estiverem em memória, busque na API
        const todasFotos = await API.listar('listarFotos'); 
        const idsRegistros = registrosDaObra.map(r => r.id_registro);
        fotosDoDia = todasFotos.filter(f => idsRegistros.includes(f.id_registro));
    }

    showLoading(false);

    if (registrosDaObra.length === 0) {
        alert("Nenhum registro encontrado para esta data.");
        return;
    }

    // 3. Dispara o construtor do PDF
    exportarRelatorioPDF(obraSelecionada, registrosDaObra, fotosDoDia, filtroData);
}