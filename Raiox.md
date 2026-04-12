**DOCUMENTO DE HANDOFF E CONTINUIDADE: OBRALOG PRO (V2)**

---

### 1. RESUMO EXECUTIVO
O ObraLog Pro (anteriormente Site Log Pro) é um ecossistema digital para registro e gestão de Diários de Obra (RDO). Composto por um PWA *Offline-First* para coleta de dados em campo e um Painel Administrativo web, o sistema substitui pranchetas físicas por um fluxo digital ágil. Ele sincroniza dados de equipe, avanço físico, ocorrências, fotos e auditoria climática automática (via GPS) diretamente para uma infraestrutura *Serverless* baseada no Google Workspace.

### 2. ESTADO ATUAL DO PROJETO

**🟢 O que já está pronto (Em Produção):**
* Interface PWA responsiva com fluxo de registro em 6 etapas (Home, Câmera, Atividade, Clima GPS, Equipe, Evolução e Resumo).
* Design System Neo-Brutalista/Swiss Design (alto contraste, botões táteis largos, Tailwind classes injetadas).
* Motor *Offline-First* (`storage.js` e `service-worker.js`) com fila de requisições local e sincronização automática.
* Backend funcional no Google Apps Script (GAS) mapeando requisições REST para o Google Sheets.
* Upload de fotos via Base64 integrado ao Google Drive.
* Integração nativa com Open-Meteo API para captura autônoma de clima via geolocalização.
* Painel Admin Web completo (Dashboard, Obras, Registros, Aditivos, Notificações).
* Gerador de relatórios técnicos de engenharia otimizado para impressão PDF.

**🟡 O que está parcialmente feito (MVP):**
* **Tratamento de Imagens:** As fotos são capturadas e convertidas em Base64, mas ainda dependem de redimensionamento eficiente via Canvas no frontend para evitar gargalos de rede em conexões lentas.
* **Controle de Aditivos e Notificações:** Backend mapeado e tabelas no Painel Admin criadas, mas modais de criação/edição no painel admin estão com *alerts* provisórios de "em desenvolvimento".

**🔴 O que ainda não foi iniciado:**
* Autenticação e Autorização (Login corporativo, SSO Google).
* Paginação de dados nas requisições GET (atualmente carrega tudo de uma vez).
* Sistema de notificações Push para alertas gerenciais.

### 3. ARQUITETURA RESUMIDA

* **Modelo:** *Client-Serverless* (Frontend Estático + API Serverless Google).
* **Frontend PWA:** Hospedado na Vercel (arquivos estáticos `index.html`, `app.js`, `api.js`, `styles.css`, `sw.js`). Manipulação direta de DOM para arquitetura Single Page Application (SPA).
* **Backend API:** Um único script `.gs` implantado como Web App no Google Apps Script, recebendo requisições POST e roteando com base no parâmetro `action`.
* **Database & Storage:** Google Sheets como banco de dados NoSQL-like (cada aba é uma entidade) e Google Drive como *blob storage* para fotos.

### 4. REGRAS DO SISTEMA E DECISÕES TÉCNICAS

* **Padrão Frontend:** JavaScript Vanilla (ES6+). Zero frameworks (sem React/Vue) para manter o bundle minúsculo e a injeção em Service Workers infalível. Tailwind via CDN para CSS.
* **Serialização de Dados:** Dados complexos intrínsecos a um registro (como a lista de trabalhadores) são convertidos via `JSON.stringify` e armazenados em uma única célula no Sheets para evitar queries complexas e operações pesadas de I/O no Apps Script.
* **UI/UX:** A interface deve seguir um padrão de contraste máximo (preto, branco, amarelo/azul Klein). Alvos de clique devem ser exageradamente grandes para facilitar o uso com EPIs ou telas sujas em campo.
* **Tratamento de Erros:** O app NUNCA deve bloquear o usuário por falta de internet ou falhas em APIs de terceiros (ex: Open-Meteo). Tudo deve ter um *fallback* manual ou fila de espera.

### 5. FLUXO DE FUNCIONAMENTO (DADOS)

1. **Input:** Usuário preenche dados e tira foto (Vercel/PWA).
2. **Empacotamento:** `app.js` junta o `appState`, converte a imagem para Base64 e monta o payload.
3. **Decisão de Rede:** Se offline, o payload vai para a fila do `localStorage`. Se online, dispara o POST.
4. **Gateway:** O Web App do Google (GAS) recebe o POST.
5. **Armazenamento:** O GAS decodifica o Base64, salva no Drive, gera a URL pública e salva a string de dados (incluindo JSONs e UUIDs) na aba respectiva do Sheets.
6. **Retorno:** JSON com `{success: true, data: {...}}` é devolvido ao PWA para limpar a fila local.

### 6. DEPENDÊNCIAS E STACK

* **Linguagens:** HTML5, CSS3, JavaScript.
* **Bibliotecas/Frameworks:** Tailwind CSS (Script CDN dinâmico).
* **APIs de Terceiros:** Open-Meteo (Previsão de tempo, endpoints públicos).
* **Infraestrutura:** Vercel, Google Apps Script, Google Workspace (Sheets/Drive).

### 7. PENDÊNCIAS E PRÓXIMOS PASSOS (BACKLOG PRIORIZADO)

1. **Implementar Modais do Admin:** Criar as interfaces HTML/JS para os botões "Novo Aditivo" e "Nova Notificação" no `admin.js`.
2. **Compressão de Imagem no Cliente:** Criar uma função *Canvas* no Passo 1 (`index.html`) para converter o file input em JPEG comprimido ou WebP antes do Base64, limitando a 1200px.
3. **Autenticação Simples:** Adicionar uma camada básica de verificação (ex: exigência de PIN ou e-mail cadastrado) para proteger as requisições à API.
4. **Paginação do Painel Admin:** Limitar as requisições `listarRegistros` aos últimos 30 dias por padrão.

### 8. PROBLEMAS EM ABERTO (KNOWN ISSUES)

* **Timeout do Apps Script:** Se a conexão móvel for extremamente lenta e a imagem em Base64 for muito pesada, o Google Apps Script pode exceder o tempo limite de execução e a requisição cair, mesmo a internet estando conectada. *(Mitigação prevista: Compressão Canvas citada no Backlog).*
* **Concorrência de Edição no Sheets:** Atualizações simultâneas exatas no `atualizarPercentualObra` podem resultar na sobreposição de linhas devido à arquitetura do Google Sheets.

### 9. INSTRUÇÕES PARA CONTINUIDADE (PARA A IA/DEV)

* **Mentalidade:** Pense *Offline-First*. Qualquer nova funcionalidade de input no PWA deve prever o que acontece se o método `fetch` falhar. Use a estrutura de `storage.js`.
* **Codificação:** Mantenha os arquivos juntos na raiz. Não crie setups complexos de Node/NPM. Se precisar adicionar estilo, use classes utilitárias do Tailwind dentro do HTML ou atualize o `.css` existente sem quebrar a estética brutalista.
* **Evite:** Evite sugerir a migração para bancos SQL tradicionais ou a adoção de React/Next.js no curto prazo. O projeto foi projetado para operar estaticamente e depender da infraestrutura livre do Google. Mantenha as modificações focadas no Apps Script (`api.gs`) ou em Vanilla JS.

---

### 10. PROMPT DE CONTINUIDADE

*(Copie o bloco abaixo e cole no início do seu próximo chat com uma IA para restaurar todo o contexto técnico instantaneamente).*

```text
Atue como Engenheiro de Software Sênior. Você está assumindo o projeto "ObraLog Pro" (V2). 

CONTEXTO TÉCNICO:
Trata-se de um PWA Offline-First para diários de obra integrado a um backend Serverless no Google Apps Script (que usa Google Sheets e Drive como banco de dados e storage). O frontend é estático (Hospedado na Vercel), puramente Vanilla JS + HTML5 + Tailwind CSS (via CDN). O Design System segue regras rígidas de alto contraste, elementos táteis grandes e estética Neo-Brutalista.

ARQUITETURA DE DADOS:
- Frontend gerencia estado, captura fotos (Base64) e tenta enviar via POST para uma URL do Web App do GAS. Se falhar, salva na fila do LocalStorage.
- O GAS recebe `{action: 'endpoint', ...dados}`, decodifica o Base64 para o Drive e insere as linhas no Sheets. Listas (como trabalhadores) são serializadas em JSON nas células.
- Há um Painel Admin integrado, também em Vanilla JS, consumindo essas mesmas APIs.

SUA MISSÃO:
Sua próxima resposta deve confirmar apenas que você entendeu a arquitetura, as restrições (Vanilla JS, GAS, Offline-first) e aguardar meu primeiro comando para iniciarmos as correções do backlog (ex: Modais do Admin, Compressão de Imagens ou Paginação). Responda de forma concisa.
```