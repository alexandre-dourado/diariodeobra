# Diário de Obra — PWA

## Deploy no Vercel

1. Faça upload da pasta para um repositório GitHub
2. Acesse vercel.com e importe o repositório
3. Clique em "Deploy" — sem configuração extra necessária

## Deploy no GitHub Pages

1. Crie um repositório no GitHub e suba todos os arquivos
2. Vá em Settings > Pages
3. Selecione a branch main como fonte
4. Acesse via: `https://seu-usuario.github.io/nome-do-repo/`

## Testar offline

1. Abra o app no Chrome (desktop ou mobile)
2. Acesse DevTools > Application > Service Workers
3. Marque "Offline" e recarregue a página
4. O app deve carregar do cache e permitir criar registros
5. Ao desmarcar "Offline", os registros pendentes sincronizam automaticamente

## Instalar como app no celular

### Android (Chrome)
1. Abra o site no Chrome
2. Toque no menu (3 pontos) > "Adicionar à tela inicial"

### iPhone (Safari)
1. Abra o site no Safari
2. Toque em Compartilhar (ícone de caixa com seta)
3. "Adicionar à Tela de Início"

## Arquitetura

- index.html — shell HTML
- styles.css — design industrial amarelo/preto
- app.js — lógica de navegação e fluxo multi-step
- api.js — comunicação com Google Apps Script
- storage.js — fila offline com localStorage
- service-worker.js — cache e funcionamento offline
- manifest.json — configuração PWA
