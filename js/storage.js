// storage.js — fila offline com localStorage

const QUEUE_KEY = 'diario_obra_queue';
const OBRAS_CACHE_KEY = 'diario_obra_obras_cache';

const Storage = {
  // --- FILA OFFLINE ---

  getQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch { return []; }
  },

  addToQueue(item) {
    const queue = this.getQueue();
    item.id_local = Date.now() + '_' + Math.random().toString(36).slice(2);
    item.created_at = new Date().toISOString();
    queue.push(item);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return item.id_local;
  },

  removeFromQueue(id_local) {
    const queue = this.getQueue().filter(i => i.id_local !== id_local);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clearQueue() {
    localStorage.removeItem(QUEUE_KEY);
  },

  // --- CACHE DE OBRAS ---

  saveObras(obras) {
    localStorage.setItem(OBRAS_CACHE_KEY, JSON.stringify(obras));
  },

  getObras() {
    try {
      return JSON.parse(localStorage.getItem(OBRAS_CACHE_KEY) || '[]');
    } catch { return []; }
  },

  // --- SINCRONIZAÇÃO ---

  async syncQueue(apiSend) {
    const queue = this.getQueue();
    if (queue.length === 0) return 0;

    let synced = 0;
    for (const item of queue) {
      try {
        await apiSend(item);
        this.removeFromQueue(item.id_local);
        synced++;
      } catch (e) {
        console.warn('Falha ao sincronizar item:', item.id_local);
        break; // para na primeira falha
      }
    }
    return synced;
  }
};
