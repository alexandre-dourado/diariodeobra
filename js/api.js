// api.js — comunicação com Google Apps Script

const BASE_URL = 'https://script.google.com/macros/s/AKfycbychp-MMPtInvHrZoeXWYLUdiiWmWIjkaXJctOhEc8QrOsM1SPEFJ7xUuznZiEF8qM/exec';

const API = {
  async listarObras() {
    const url = `${BASE_URL}?action=listarObras`;
    const res = await fetch(url, { redirect: 'follow' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erro ao listar obras');
    return json.data;
  },

  async criarRegistro(dados) {
    // GAS recebe melhor como form-urlencoded para POST simples
    const params = new URLSearchParams({ action: 'criarRegistro', ...dados });
    const res = await fetch(BASE_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erro ao criar registro');
    return json.data; // { id_registro, ... }
  },

  async uploadFoto(id_registro, base64) {
    const params = new URLSearchParams({ action: 'uploadFoto', id_registro, base64 });
    const res = await fetch(BASE_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Erro ao enviar foto');
    return json.data;
  },

  isOnline() {
    return navigator.onLine;
  }
};
