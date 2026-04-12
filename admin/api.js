// Substitua pela URL do seu Deploy (Web App) no Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbychp-MMPtInvHrZoeXWYLUdiiWmWIjkaXJctOhEc8QrOsM1SPEFJ7xUuznZiEF8qM/exec';

const API = {
    // --- Requisições GET ---
    async listar(endpoint) {
        try {
            const response = await fetch(`${SCRIPT_URL}?action=${endpoint}`);
            const json = await response.json();
            if (!json.success) throw new Error(json.error || `Erro ao carregar ${endpoint}`);
            return json.data;
        } catch (error) {
            console.error(`Erro em API.listar(${endpoint}):`, error);
            alert(`Falha ao conectar com servidor (${endpoint})`);
            return [];
        }
    },

    // --- Requisições POST ---
    async enviar(endpoint, dados) {
        try {
            const params = new URLSearchParams();
            params.append('action', endpoint);
            
            // Adiciona todos os dados ao payload
            for (const key in dados) {
                if (dados.hasOwnProperty(key)) {
                    params.append(key, dados[key]);
                }
            }

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                redirect: 'follow', // Essencial para o Apps Script
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });

            const json = await response.json();
            if (!json.success) throw new Error(json.error || `Erro em ${endpoint}`);
            return json.data;
        } catch (error) {
            console.error(`Erro em API.enviar(${endpoint}):`, error);
            alert(`Falha ao enviar dados (${endpoint})`);
            return null;
        }
    }
};