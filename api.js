// api.js — comunicação com Google Apps Script

const BASE_URL = 'https://script.google.com/macros/s/AKfycbychp-MMPtInvHrZoeXWYLUdiiWmWIjkaXJctOhEc8QrOsM1SPEFJ7xUuznZiEF8qM/exec';

const API = {

  // GET: lista todas as obras
  async listarObras() {
    const url = `${BASE_URL}?action=listarObras`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error('Erro HTTP: ' + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erro ao listar obras');
    return json.data;
  },

  // POST: cria registro diário — usa form-urlencoded (simples e compatível com GAS)
  async criarRegistro(dados) {
    const params = new URLSearchParams();
    params.append('action', 'criarRegistro');
    Object.entries(dados).forEach(([k, v]) => params.append(k, v ?? ''));

    const res = await fetch(BASE_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    if (!res.ok) throw new Error('Erro HTTP: ' + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erro ao criar registro');
    return json.data;
  },

  // POST: upload de foto — usa JSON porque base64 é grande demais para URLSearchParams
  async uploadFoto(id_registro, base64) {
    const body = JSON.stringify({ action: 'uploadFoto', id_registro, base64 });

    const res = await fetch(BASE_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    if (!res.ok) throw new Error('Erro HTTP upload: ' + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erro ao enviar foto');
    return json.data;
  },

  isOnline() {
    return navigator.onLine;
  }
};