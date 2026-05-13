/**
 * Cernion API Client — konfigurierbar für Dev/Prod
 */
const CERNION_CONFIG_KEY = 'cernion.api.config';

class CernionAPI {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const raw = localStorage.getItem(CERNION_CONFIG_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn('Config parse error', e); }
    return {
      baseUrl: 'http://10.0.0.8:3900/api',
      tenantId: 'agentic-hackathon',
      token: ''
    };
  }

  saveConfig(cfg) {
    this.config = { ...this.config, ...cfg };
    localStorage.setItem(CERNION_CONFIG_KEY, JSON.stringify(this.config));
  }

  get headers() {
    const h = {
      'Content-Type': 'application/json',
      'x-tenant-id': this.config.tenantId
    };
    if (this.config.token) {
      h['Authorization'] = `Bearer ${this.config.token}`;
    }
    return h;
  }

  async get(endpoint) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async post(endpoint, body) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async listMelos() {
    return this.get('/edm/melos');
  }

  async getTimeseries(meloId, obis, from, to) {
    const params = new URLSearchParams({ from, to });
    if (obis) params.set('obis', obis);
    return this.get(`/edm/timeseries/${meloId}?${params}`);
  }

  async validateConnection(location, capacityKw) {
    return this.post('/grid-connection/validate', {
      location,
      installedCapacityKw: capacityKw
    });
  }

  async forecastGeneration(postleitzahl, date, capacityKw) {
    return this.post('/forecast/generation', {
      postleitzahl,
      date,
      installationType: 'solar',
      forecastDays: 1
    });
  }
}

const api = new CernionAPI();
