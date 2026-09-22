/**
 * ECDAT Frontend API Client
 * Seamlessly interfaces with the FastAPI backend (/api/v1).
 * Supports GitHub Pages -> Render backend cross-origin communication.
 * Falls back gracefully to local fixtures if backend is offline or sleeping.
 */

export function getApiBase() {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('ecdat_custom_api_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '');
    }
  }
  if (import.meta.env.VITE_API_URL) {
    const envUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
    return envUrl.endsWith('/api/v1') ? envUrl : `${envUrl}/api/v1`;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8000/api/v1';
    }
  }
  return 'https://ecdat-p9py.onrender.com/api/v1';
}

export function setCustomApiBase(url) {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      const formatted = url.trim().replace(/\/$/, '');
      const withV1 = formatted.endsWith('/api/v1') ? formatted : `${formatted}/api/v1`;
      localStorage.setItem('ecdat_custom_api_url', withV1);
      return withV1;
    } else {
      localStorage.removeItem('ecdat_custom_api_url');
      return getApiBase();
    }
  }
  return getApiBase();
}

async function request(endpoint, options = {}) {
  const base = getApiBase();
  const url = `${base}${endpoint}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `API request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.debug(`[ECDAT API] Offline/Fallback mode for ${endpoint}:`, err.message);
    return null;
  }
}

export const api = {
  getBaseUrl() {
    return getApiBase();
  },

  setBaseUrl(url) {
    return setCustomApiBase(url);
  },

  // Health check with latency measurement
  async checkHealth() {
    const start = Date.now();
    const res = await request('/health');
    const latency = Date.now() - start;
    if (res && res.status === 'healthy') {
      return { ok: true, latency, data: res };
    }
    return { ok: false, latency, error: 'Unreachable' };
  },

  // Dashboard
  async getDashboardSummary() {
    return await request('/dashboard/summary');
  },

  // Assets
  async getAssets(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.riskBand) query.set('riskBand', params.riskBand);
    if (params.quantum) query.set('quantum', params.quantum);
    if (params.application) query.set('application', params.application);
    if (params.purpose) query.set('purpose', params.purpose);
    if (params.page) query.set('page', params.page);
    if (params.pageSize) query.set('pageSize', params.pageSize);

    const qStr = query.toString();
    return await request(`/assets${qStr ? `?${qStr}` : ''}`);
  },

  async getAsset(id) {
    return await request(`/assets/${id}`);
  },

  async createAsset(assetData) {
    return await request('/assets', {
      method: 'POST',
      body: JSON.stringify(assetData)
    });
  },

  async updateAsset(id, updates) {
    return await request(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteAsset(id) {
    return await request(`/assets/${id}`, {
      method: 'DELETE'
    });
  },

  async exportCBOM() {
    return await request('/assets/export/cbom');
  },

  // Scans & Analysis
  async getScans() {
    return await request('/scans');
  },

  async createScan(scanData) {
    return await request('/scans', {
      method: 'POST',
      body: JSON.stringify(scanData)
    });
  },

  async analyzeCode(code, filename = 'snippet.py') {
    return await request('/scans/analyze', {
      method: 'POST',
      body: JSON.stringify({ code, filename })
    });
  },

  // Risks
  async getRiskSummary() {
    return await request('/risks/summary');
  },

  async getRiskMatrix() {
    return await request('/risks/matrix');
  },

  async getHndlAssets() {
    return await request('/risks/hndl');
  },

  // Mosca
  async calculateMosca(shelfLifeYears, migrationTimeYears, threatHorizonYears) {
    return await request('/mosca/assess', {
      method: 'POST',
      body: JSON.stringify({
        dataShelfLifeYears: Number(shelfLifeYears),
        migrationTimeYears: Number(migrationTimeYears),
        threatHorizonYears: Number(threatHorizonYears)
      })
    });
  },

  // Migration
  async getMigrationTasks() {
    return await request('/migration/tasks');
  },

  async createMigrationTask(taskData) {
    return await request('/migration/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  async updateMigrationTask(id, updates) {
    return await request(`/migration/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteMigrationTask(id) {
    return await request(`/migration/tasks/${id}`, {
      method: 'DELETE'
    });
  },

  // Recommendations
  async getRecommendations() {
    return await request('/recommendations');
  },

  async evaluateRecommendation(purpose, algorithm) {
    return await request('/recommendations/evaluate', {
      method: 'POST',
      body: JSON.stringify({ purpose, algorithm })
    });
  },

  // Graph
  async getGraph() {
    return await request('/graph');
  }
};
