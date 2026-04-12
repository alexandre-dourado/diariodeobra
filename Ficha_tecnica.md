**DOCUMENTAÇÃO DE ARQUITETURA E ENGENHARIA — SITE LOG PRO (DIÁRIO DE OBRA V2)**

---

### 1. VISÃO GERAL DO SISTEMA

* **O que é o projeto:** O "Site Log Pro" é um ecossistema digital composto por um aplicativo de campo (PWA - Progressive Web App) e um Painel Administrativo web, projetado para o registro e gestão de diários de obras de engenharia civil.
* **Objetivo principal:** Digitalizar, padronizar e auditar a coleta de dados diários em canteiros de obras (atividades, efetivo, clima, avanço físico e ocorrências), garantindo a integridade da informação desde o campo até a gestão central.
* **Problema que resolve:** Elimina o uso de diários de papel, reduz o tempo de preenchimento, resolve o problema de falta de conectividade nos canteiros (com capacidade *offline-first*), automatiza a coleta de dados climáticos auditáveis e centraliza informações cruciais para a análise de pleitos (aditivos) e controle de notificações.
* **Tipo de sistema:** Aplicação Web *Serverless*, PWA *Offline-First* integrado a um banco de dados baseado em planilhas na nuvem (Google Sheets) com armazenamento de objetos em nuvem (Google Drive).

### 2. ARQUITETURA

* **Estrutura geral:** Arquitetura *Client-Serverless* dividida em três camadas:
    * **Client-Side (Frontend):** PWA hospedado na Vercel, composto por um App de Campo (SPA em 6 etapas) e um Painel Admin.
    * **API Layer (Backend):** Google Apps Script (GAS) atuando como um gateway e controlador *serverless*, expondo endpoints RESTful (via parâmetros `action` em requisições POST/GET).
    * **Data Layer (Database/Storage):** Google Sheets servindo como banco de dados relacional simulado (Abas como tabelas) e Google Drive atuando como *blob storage* para imagens.
* **Padrões utilizados:**
    * *Single Page Application (SPA):* Roteamento feito via manipulação de DOM (classes `.hidden-view`), sem recarregamento de página.
    * *Offline-First / Cache-First:* Uso de Service Workers para *caching* estático e LocalStorage para fila de requisições assíncronas.
    * *Design System:* Princípios de *Swiss Design* e *Neo-Brutalism* para UI, priorizando alvos de toque grandes e alto contraste para uso sob luz solar intensa.
* **Fluxo de dados:** 1. Input do usuário/sensores (GPS) atualiza o objeto `appState`.
    2. Payload é construído (conversão de imagem para Base64, serialização de arrays em JSON).
    3. Requisição `fetch` é enviada (POST). Se offline, o payload vai para a `storage_queue`.
    4. Backend GAS recebe a requisição, decodifica a imagem, salva no Drive, obtém a URL pública e salva o registro estruturado no Sheets.

### 3. COMPONENTES E MÓDULOS

* **Módulo PWA (App de Campo):**
    * *Engine de Câmera:* Captura nativa via `<input capture="environment">` com redimensionamento via Canvas (`app.js`) para mitigar peso do Base64.
    * *Engine Meteorológica:* Integração com API Open-Meteo usando Geolocation API para preenchimento automático auditável.
    * *Engine de Sincronização (`storage.js`):* Gerencia *fallback* para offline, interceptando falhas de rede e reprocessando a fila no evento `window.addEventListener('online')`.
* **Módulo Backend (GAS `api.gs`):**
    * *Router (`doGet` / `doPost`):* Direciona requisições baseado no parâmetro `action`.
    * *UUID Generator:* Gera identificadores únicos universais para garantir integridade referencial.
    * *Drive Blob Manager:* Decodifica strings Base64 para MIME types e cria arquivos no Drive.
* **Módulo Admin (`admin.js` / `index.html`):**
    * *Dashboard:* Consome APIs de agregação para métricas de KPI (Avanço, Notificações, Aditivos).
    * *Gerador de Relatórios:* Compila dados JSON em um template HTML renderizado em uma nova janela para exportação PDF nativa do SO (`window.print()`).

### 4. FUNCIONAMENTO DETALHADO

* **Fluxo Principal de Registro (Caminho Feliz):**
    1. Usuário abre o PWA; Service Worker serve os arquivos. App faz GET `/listarObras` e renderiza a Home.
    2. Usuário seleciona obra -> Tira foto -> Seleciona atividade.
    3. Clica em "Detectar Clima": App pega Lat/Lon -> Fetch Open-Meteo -> Preenche UI.
    4. Adiciona trabalhadores (armazenados em array temporário) -> Define % de avanço da obra no *slider*.
    5. Clica em Sincronizar: O `app.js` empacota o `appState`, converte a foto em Base64 comprimido.
    6. Requisição POST `/criarRegistro` é enviada. Retorna o ID. Requisição POST `/atualizarPercentualObra` é enviada em paralelo.
* **Processamento Interno de *Retry*:**
    * Se o `fetch` falhar (offline), o `storage.js` anexa um `id_local` e salva o payload em `localStorage`.
    * Ao recuperar conexão, o listener itera sobre a fila, dispara os POSTs sequencialmente e remove do *storage* em caso de sucesso (`200 OK`).

### 5. STACK TECNOLÓGICA

* **Frontend:** HTML5, CSS3, JavaScript (ES6+ Vanilla).
* **Frameworks de UI:** Tailwind CSS (via CDN em *runtime* para agilidade, configurado para *Just-in-Time*).
* **Backend:** Google Apps Script (Baseado em V8 JavaScript engine).
* **Persistência:** Google Sheets (Tabelas), Google Drive (Storage), IndexedDB/LocalStorage (Cache cliente).
* **Infraestrutura:** Vercel (Hospedagem estática contínua ligada ao GitHub), Google Cloud (Execução da API GAS).
* **APIs Externas:** Open-Meteo API (Clima REST).

### 6. DECISÕES TÉCNICAS E TRADE-OFFS

* **GAS + Sheets vs. Node.js + SQL/NoSQL:**
    * *Motivo:* Custo zero de infraestrutura e disponibilização imediata dos dados crus para *stakeholders* não-técnicos (clientes/diretoria) sem necessidade de construir interfaces de exportação complexas.
    * *Trade-off:* Sheets não é um banco transacional. Não há *foreign keys* estritas, a latência de I/O é alta (1-3s por *request*) e há limites de tempo de execução e cota diária de leitura/escrita.
* **Vanilla JS + CDN Tailwind vs. React/Build Step:**
    * *Motivo:* Manter o projeto com o menor número possível de dependências e arquivos físicos, facilitando a injeção em Service Workers e garantindo carregamento ultrarrápido inicial.
    * *Trade-off:* Ausência de *Two-Way Data Binding* nativo, exigindo manipulação manual do DOM (ex: `document.getElementById`) que pode se tornar verbosa e propensa a *bugs* de estado em caso de escalabilidade da UI.
* **Serialização JSON em Célula Única (Equipe):**
    * *Motivo:* Evitar a criação de uma tabela intermediária (N:N) complexa no Sheets, armazenando o *array* de equipe como string JSON na coluna `trabalhadores_json`.
    * *Trade-off:* Impossibilidade de fazer queries ou filtros diretamente nas planilhas pela equipe sem usar scripts ou PowerQuery no Excel posteriormente.
* **Upload Base64 via JSON:**
    * *Motivo:* GAS lida mal com requisições `multipart/form-data` fora de formulários HTML nativos do Google. Base64 é seguro para transmissão via payload.
    * *Trade-off:* Base64 aumenta o tamanho do arquivo em ~33%, exigindo compressão pesada no cliente antes do envio para evitar *timeout* da API.

### 7. PONTOS FORTES

* **Custos de Operação (OPEX) Mínimos:** Escalável para dezenas de obras sem custo de nuvem.
* **Resiliência em Campo:** Arquitetura projetada especificamente para zonas de sombra (sem rede de dados).
* **Auditoria Climática:** Integração Open-Meteo remove o viés humano da justificativa de atrasos.
* **Alta Manutenibilidade:** Stack simples; qualquer desenvolvedor web básico consegue dar suporte à aplicação.

### 8. LIMITAÇÕES E RISCOS

* **Segurança e Autenticação:** A API no GAS é pública para quem tem a URL. Não há autenticação robusta implementada (JWT/OAuth); o acesso é controlado por obscuridade do endpoint.
* **Escalabilidade de Dados:** Google Sheets tem limite de 10 milhões de células. Obras longas com muitas fotos diárias podem inchar o documento, causando lentidão nos métodos `getDataRange().getValues()`.
* **Concorrência:** Se vários engenheiros submeterem dados exatamente no mesmo milissegundo, pode haver bloqueio de linha no Sheets, gerando falha silenciosa.

### 9. OPORTUNIDADES DE MELHORIA (ROADMAP TÉCNICO)

1.  **Migração Progressiva de BD:** Migrar a camada de dados do Sheets para o Supabase (PostgreSQL) mantendo a arquitetura atual do frontend.
2.  **Autenticação Genérica:** Implementar Google Identity Services (SSO) no frontend para assinar criptograficamente quem está enviando o registro, bloqueando endpoints para usuários não autorizados.
3.  **Paginação de APIs:** Alterar os endpoints GET (`listarRegistros`) para suportar limites e *offsets*, evitando o carregamento de milhares de nós no DOM simultaneamente.
4.  **Compressão WebP:** Substituir o `image/jpeg` no Canvas do frontend por `image/webp` para reduzir o tamanho dos *payloads* em mais 40% sem perda de qualidade visual.