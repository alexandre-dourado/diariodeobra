// storage.js — fila offline
const QUEUE_KEY = 'obra_log_queue_v2';
const OBRAS_KEY = 'obra_log_obras_v2';

const Storage = {
  getQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch { return []; }
  },
  addToQueue(item) {
    const q = this.getQueue();
    item.id_local = Date.now() + '_' + Math.random().toString(36).slice(2);
    item.criado_em = new Date().toISOString();
    q.push(item);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    return item.id_local;
  },
  removeFromQueue(id_local) {
    const q = this.getQueue().filter(i => i.id_local !== id_local);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  },
  saveObras(obras) {
    localStorage.setItem(OBRAS_KEY, JSON.stringify(obras));
  },
  getObras() {
    try { return JSON.parse(localStorage.getItem(OBRAS_KEY) || '[]'); }
    catch { return []; }
  }
};
