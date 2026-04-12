// api.js
const BASE_URL = 'https://script.google.com/macros/s/AKfycbychp-MMPtInvHrZoeXWYLUdiiWmWIjkaXJctOhEc8QrOsM1SPEFJ7xUuznZiEF8qM/exec';

const API = {
  async listarObras() {
    const res = await fetch(`${BASE_URL}?action=listarObras`, { redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    if (!j.success) throw new Error(j.error || 'Erro ao listar obras');
    return j.data;
  },

  async criarRegistro(dados) {
    const p = new URLSearchParams({ action: 'criarRegistro' });
    Object.entries(dados).forEach(([k, v]) => p.append(k, v ?? ''));
    const res = await fetch(BASE_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p.toString()
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    if (!j.success) throw new Error(j.error);
    return j.data;
  },

  async uploadFoto(id_registro, base64) {
    const res = await fetch(BASE_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'uploadFoto', id_registro, base64 })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    if (!j.success) throw new Error(j.error);
    return j.data;
  }
};
