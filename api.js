/**
 * Cernion API Client — mit konfigurierbarer API + Demo-Fallback
 */

// --- Fallback Demo Data ---
const DEMO_MELos = [
  {
    meloId: "melo-pv-freiflaeche-01",
    name: "PV Freifläche Hockenheim 8,2 MWp",
    type: "physical",
    metadata: {
      capacityKw: 8200,
      location: "Hockenheim, Baden-Württemberg",
      postleitzahl: "68766",
      installationType: "ground-mounted",
      commissioningDate: "2023-06-15",
      landAreaHa: 12.5
    }
  },
  {
    meloId: "melo-pv-dach-02",
    name: "PV Dach Halle Ost 450 kWp",
    type: "physical",
    metadata: {
      capacityKw: 450,
      location: "Hockenheim, Baden-Württemberg",
      postleitzahl: "68766",
      installationType: "roof-mounted",
      commissioningDate: "2022-03-10"
    }
  },
  {
    meloId: "melo-pv-freiflaeche-03",
    name: "PV Freifläche Sandhausen 5,0 MWp",
    type: "physical",
    metadata: {
      capacityKw: 5000,
      location: "Sandhausen, Baden-Württemberg",
      postleitzahl: "69207",
      installationType: "ground-mounted",
      commissioningDate: "2024-01-20",
      landAreaHa: 7.8
    }
  },
  {
    meloId: "melo-anschluss-hv",
    name: "Netzanschluss HV Industrie Hockenheim",
    type: "physical",
    metadata: {
      connectionVoltage: "20kV",
      connectionCapacityKw: 15000,
      location: "Hockenheim, Baden-Württemberg",
      postleitzahl: "68766",
      customerType: "industrial",
      gridConnectionId: "GA-HV-2021-0047"
    }
  }
];

function generatePVData(capacityKw, date) {
  const data = [];
  for (let i = 0; i < 96; i++) {
    const hour = i / 4.0;
    const h = String(Math.floor(hour)).padStart(2, '0');
    const m = String((i % 4) * 15).padStart(2, '0');
    const timestamp = date + "T" + h + ":" + m + ":00Z";
    let power = 0;
    if (hour >= 5.5 && hour <= 21.5) {
      const dayPos = (hour - 5.5) / 16.0;
      const envelope = Math.sin(dayPos * Math.PI);
      const pf = 0.75 + 0.05 * Math.sin((dayPos - 0.5) * Math.PI * 2);
      power = capacityKw * pf * envelope;
      let hash = 0;
      for (let j = 0; j < timestamp.length; j++) hash = ((hash << 5) - hash) + timestamp.charCodeAt(j);
      const noise = ((Math.abs(hash) % 100) - 50) / 5000;
      power *= (1 + noise);
    }
    data.push({ ts: timestamp, value: Math.max(0, Math.round(power * 100) / 100) });
  }
  return data;
}

function generateConsumptionData(date) {
  const data = [];
  const baseKw = 2000, peakKw = 8000;
  for (let i = 0; i < 96; i++) {
    const hour = i / 4.0;
    const h = String(Math.floor(hour)).padStart(2, '0');
    const m = String((i % 4) * 15).padStart(2, '0');
    const timestamp = date + "T" + h + ":" + m + ":00Z";
    let load = baseKw * 0.3;
    if (hour >= 6 && hour < 8)
      load = baseKw * 0.3 + (hour - 6) / 2 * baseKw * 0.7;
    else if (hour >= 8 && hour < 9)
      load = baseKw + (hour - 8) * (peakKw - baseKw);
    else if (hour >= 9 && hour < 17) {
      let hash = 0;
      for (let j = 0; j < timestamp.length; j++) hash = ((hash << 5) - hash) + timestamp.charCodeAt(j);
      load = peakKw + ((Math.abs(hash) % 200) - 100) / 10;
    } else if (hour >= 17 && hour < 19)
      load = peakKw - (hour - 17) / 2 * (peakKw - baseKw * 0.5);
    else if (hour >= 19 && hour < 23)
      load = baseKw * 0.5 - (hour - 19) / 4 * baseKw * 0.2;
    data.push({ ts: timestamp, value: Math.max(0, Math.round(load * 100) / 100) });
  }
  return data;
}

const DEMO_TIMESERIES = {
  "melo-pv-freiflaeche-01": generatePVData(8200, "2026-05-12"),
  "melo-pv-dach-02": generatePVData(450, "2026-05-12"),
  "melo-pv-freiflaeche-03": generatePVData(5000, "2026-05-12"),
  "melo-anschluss-hv": generateConsumptionData("2026-05-12")
};

// --- API Client ---
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
      baseUrl: 'https://api.cernion.de/',
      tenantId: 'agentic-hackathon',
      token: ''
    };
  }

  saveConfig(cfg) {
    this.config = { ...this.config, ...cfg };
    localStorage.setItem(CERNION_CONFIG_KEY, JSON.stringify(this.config));
  }

  get headers() {
    const h = { 'Content-Type': 'application/json', 'x-tenant-id': this.config.tenantId };
    if (this.config.token) h['Authorization'] = 'Bearer ' + this.config.token;
    return h;
  }

  async get(endpoint) {
    const url = this.config.baseUrl + endpoint;
    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + res.statusText);
      return res.json();
    } catch (e) {
      throw this.wrapError(e);
    }
  }

  async post(endpoint, body) {
    const url = this.config.baseUrl + endpoint;
    try {
      const res = await fetch(url, { method: 'POST', headers: this.headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + res.statusText);
      return res.json();
    } catch (e) {
      throw this.wrapError(e);
    }
  }

  wrapError(e) {
    if (e.message.indexOf('Failed to fetch') >= 0 || e.message.indexOf('CORS') >= 0) {
      e.isCORS = true;
    }
    return e;
  }

  // --- EDM ---
  async listMelos() {
    try {
      return await this.get('api/edm/melos');
    } catch (e) {
      console.warn('API unavailable, returning demo melos');
      return this.demoMelos;
    }
  }
  async getTimeSeries(meloId, obis, from, to) {
    try {
      return await this.get('api/edm/timeseries/' + meloId + '?obis=' + obis + '&from=' + from + '&to=' + to);
    } catch (e) {
      console.warn('API failed, using demo data');
      const values = DEMO_TIMESERIES[meloId] || [];
      const totalKwh = values.reduce(function(s, v) { return s + v.value / 4; }, 0);
      const vals = values.map(function(v) { return v.value; });
      return {
        success: true, meloId: meloId, obis: obis, from: from, to: to,
        resolution: '15min', values: values,
        summary: {
          count: values.length,
          total_kwh: totalKwh.toFixed(2),
          min_kw: vals.length ? Math.min.apply(null, vals).toFixed(2) : 0,
          max_kw: vals.length ? Math.max.apply(null, vals).toFixed(2) : 0,
          avg_kw: vals.length ? (vals.reduce(function(s,v){return s+v;},0) / vals.length).toFixed(2) : 0
        }
      };
    }
  }

  // --- Grid Connection ---
  async validateConnection(location, capacityKw) {
    try {
      return await this.post('api/grid-connection/validate', {
        location: location,
        installedCapacityKw: capacityKw
      });
    } catch (e) {
      console.warn('API failed, using demo data');
      const go = capacityKw <= 15000;
      return {
        overallGo: go,
        qualityScore: go ? 85 : 45,
        findings: go ? [
          { code: 'CAP_OK', severity: 'info', message: 'Anlagenleistung im zulässigen Rahmen (≤15 MW)', rule: 'MAX_CAPACITY_CHECK' },
          { code: 'LOC_OK', severity: 'info', message: 'Standort ' + location + ' im Versorgungsgebiet', rule: 'SERVICE_TERRITORY_CHECK' }
        ] : [
          { code: 'CAP_HIGH', severity: 'warning', message: 'Anlagenleistung über 15 MW — HV-Anbindung erforderlich', rule: 'MAX_CAPACITY_CHECK' },
          { code: 'LOC_OK', severity: 'info', message: 'Standort ' + location + ' im Versorgungsgebiet', rule: 'SERVICE_TERRITORY_CHECK' }
        ],
        metrics: { connectionVoltage: capacityKw > 15000 ? '110kV' : '20kV', estimatedDistanceKm: 2.5 }
      };
    }
  }

  // --- Forecast ---
  async forecastGeneration(postleitzahl, date, capacityKw) {
    try {
      return await this.post('api/forecast/generation', {
        postleitzahl: postleitzahl,
        date: date,
        installationType: 'solar',
        forecastDays: 1
      });
    } catch (e) {
      console.warn('API failed, using demo data');
      const values = generatePVData(capacityKw, date);
      return {
        success: true,
        type: 'solar',
        totalKwh: values.reduce(function(s,v){return s+v.value/4;},0).toFixed(2),
        peakKw: Math.max.apply(null, values.map(function(v){return v.value;})).toFixed(2),
        values: values
      };
    }
  }
}

const api = new CernionAPI();
