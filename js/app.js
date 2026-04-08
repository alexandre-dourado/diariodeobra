/**
 * SITE LOG PRO - Lógica Frontend
 */

// === CONFIGURAÇÕES ===
// Substitua pela URL gerada no Deploy do seu Google Apps Script
const API_URL = "SUA_URL_DO_WEB_APP_AQUI"; 

// === ESTADO DO APLICATIVO ===
let appState = {
    id_obra: null,
    nome_obra: null,
    foto_base64: null,
    atividade: null,
    teve_problema: false,
    categoria_problema: "",
    medicao: 0,
    criado_por: "Eng. Alexandre" // Pode ser dinâmico depois
};

// === NAVEGAÇÃO ===
function goToView(viewId) {
    document.querySelectorAll('.view-container').forEach(el => {
        el.classList.add('hidden-view');
    });
    document.getElementById(viewId).classList.remove('hidden-view');
    window.scrollTo(0, 0);
}

// === LÓGICA DO PASSO 1: FOTO ===
function initStep1() {
    const btnCamera = document.querySelector('#view-step1 button:has(span:contains("ABRIR CÂMERA"))');
    const cameraInput = document.getElementById('camera-input');
    const imagePreview = document.querySelector('#view-step1 img'); // Ajuste o seletor para a imagem de preview
    
    if(btnCamera && cameraInput) {
        btnCamera.addEventListener('click', () => cameraInput.click());
        
        cameraInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    appState.foto_base64 = reader.result;
                    // Atualiza a UI para mostrar a foto tirada
                    if(imagePreview) {
                        imagePreview.src = reader.result;
                        imagePreview.classList.remove('grayscale', 'opacity-50');
                    }
                    // Habilita botão "Próxima Etapa"
                    document.querySelector('#view-step1 button:contains("PRÓXIMA ETAPA")').disabled = false;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// === INTEGRAÇÃO COM BACKEND ===

// Chama as obras do Sheets para popular a tela inicial
async function carregarObras() {
    try {
        const response = await fetch(`${API_URL}?action=listarObras`);
        const result = await response.json();
        
        if (result.success) {
            console.log("Obras carregadas:", result.data);
            // Aqui você renderiza a lista de obras (os cards do passo_inicial)
            // ex: result.data.forEach(obra => renderCardObra(obra));
        }
    } catch (error) {
        console.error("Erro ao carregar obras:", error);
    }
}

// Envia o registro final (Passo 5)
async function enviarRegistro() {
    // 1. Mostrar loading na tela
    const btnSalvar = document.querySelector('#view-step5 button:contains("SALVAR REGISTRO")');
    btnSalvar.innerHTML = "ENVIANDO...";
    
    try {
        // 2. Criar Registro
        const payloadRegistro = {
            id_obra: appState.id_obra || "ID_TESTE_PROVISORIO", 
            descricao_atividade: appState.atividade,
            problemas: appState.teve_problema ? appState.categoria_problema : "Nenhum",
            medicoes: `${appState.medicao} m²`,
            criado_por: appState.criado_por
        };

        const reqRegistro = await fetch(`${API_URL}?action=criarRegistro`, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payloadRegistro),
            redirect: "follow"
        });
        const resRegistro = await reqRegistro.json();

        // 3. Se deu certo e tem foto, envia a foto
        if (resRegistro.success && appState.foto_base64) {
            const idCriado = resRegistro.data.id_registro;
            
            const payloadFoto = {
                id_registro: idCriado,
                base64: appState.foto_base64
            };
            
            await fetch(`${API_URL}?action=uploadFoto`, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payloadFoto),
                redirect: "follow"
            });
        }

        // 4. Mostrar Modal de Sucesso
        alert("Registro Salvo com Sucesso!"); // Substitua pelo modal do seu HTML
        goToView('view-home'); // Volta pro início

    } catch (error) {
        console.error("Erro ao enviar:", error);
        alert("Erro ao enviar registro. Verifique a internet.");
    } finally {
        btnSalvar.innerHTML = "SALVAR REGISTRO";
    }
}

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
    // Configura os botões de navegação (Exemplo simples)
    document.querySelector('button:contains("REGISTRAR HOJE")').addEventListener('click', () => goToView('view-step1'));
    // Adicione os Event Listeners dos outros botões de "Avançar" aqui...
    
    // Inicia funções específicas de tela
    initStep1();
    carregarObras();
});

// Helper para selecionar texto (jQuery-like) para facilitar os querySelectors acima
HTMLElement.prototype.contains = function(text) {
    return Array.from(this.querySelectorAll('*')).find(el => el.textContent.includes(text));
};