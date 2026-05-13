/**
 * PV Freiflächen Express-Check
 * Echtzeit-Dashboard für Projektierer
 */

let chartInstances = {};

// Startup
document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  loadDashboard();
  setupTabs();
});

function setupTabs() {
  document.querySelectorAll('nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(target).classList.add('active');
      if (target === 'dashboard') loadDashboard();
      if (target === 'anlagen') loadAnlagen();
      if (target === 'pruefung') initPruefung();
      if (target === 'einstellungen') loadSettings();
    });
  });
}

async function loadDashboard() {
  showLoading(true);
  try {
    const melos = await api.listMelos();
    renderDashboard(melos.rows || []);
  } catch (e) {
    showError(e.message);
  } finally {
    showLoading(false);
  }
}

function renderDashboard(melos) {
  const container = document.getElementById('dashboard-cards');
  container.innerHTML = '';

  // Get only generation melos (PV plants)
  const pvMelos = melos.filter(m => 
    m.meloId?.includes('pv') || 
    m.metadata?.installationType?.includes('ground') ||
    m.metadata?.installationType?.includes('roof')
  );

  const gridMelo = melos.find(m => m.meloId?.includes('anschluss'));

  // KPI cards
  const totalCapacity = pvMelos.reduce((s, m) => s + (m.metadata?.capacityKw || 0), 0);
  const avgCommissioning = pvMelos.length > 0 ? 
    pvMelos.map(m => new Date(m.metadata?.commissioningDate).getFullYear()).reduce((a,b) => a+b,0) / pvMelos.length : 
    null;

  const kpiHtml = `
    <div class="grid kpi-grid">
      <article class="kpi-card">
        <h3>Gesamtleistung</h3>
        <p class="kpi-value">${totalCapacity.toLocaleString('de-DE')} <span>kWp</span></p>
        <small>${pvMelos.length} Anlagen</small>
      </article>
      <article class="kpi-card">
        <h3>Standort</h3>
        <p class="kpi-value">${pvMelos[0]?.metadata?.location || '—'}</p>
        <small>PLZ ${pvMelos[0]?.metadata?.postleitzahl || '—'}</small>
      </article>
      <article class="kpi-card">
        <h3>Netzanschluss</h3>
        <p class="kpi-value">${gridMelo?.metadata?.connectionVoltage || '—'}</p>
        <small>Kapazität ${(gridMelo?.metadata?.connectionCapacityKw/1000).toFixed(1)} MW</small>
      </article>
      <article class="kpi-card">
        <h3>Ø Inbetriebnahme</h3>
        <p class="kpi-value">${avgCommissioning ? Math.round(avgCommissioning) : '—'}</p>
        <small>${pvMelos.length} Anlagen</small>
      </article>
    </div>
  `;

  // Load timeseries for PV plant #1
  const tsContainer = document.createElement('div');
  tsContainer.id = 'ts-chart-container';
  tsContainer.innerHTML = `
    <h2>Tagesverlauf: ${pvMelos[0]?.name || 'PV-Anlage'}</h2>
    <canvas id="ts-chart"></canvas>
  `;

  container.innerHTML = kpiHtml;
  container.appendChild(tsContainer);

  if (pvMelos.length > 0) {
    loadTimeseriesChart(pvMelos[0].meloId, '1-0:2.7.0', 'ts-chart');
  }
}

async function loadTimeseriesChart(meloId, obis, canvasId) {
  const date = new Date().toISOString().split('T')[0];
  const from = `${date}T00:00:00Z`;
  const to = `${date}T23:59:59Z`;

  try {
    const data = await api.getTimeseries(meloId, obis, from, to);
    renderChart(canvasId, data);
  } catch (e) {
    console.error('Chart load failed:', e);
  }
}

function renderChart(canvasId, apiData) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;

  const labels = apiData.values?.map(v => v.ts?.slice(11, 16)) || [];
  const values = apiData.values?.map(v => v.value) || [];

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Leistung (kW)',
        data: values,
        borderColor: '#e8b339',
        backgroundColor: 'rgba(232, 179, 57, 0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 1,
        pointHoverRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.y.toFixed(1)} kW`
          }
        },
        legend: { display: false }
      },
      scales: {
        x: { 
          grid: { display: false },
          ticks: { maxTicksLimit: 8 }
        },
        y: { 
          title: { display: true, text: 'kW' },
          beginAtZero: true 
        }
      }
    }
  });
}

async function loadAnlagen() {
  showLoading(true);
  try {
    const melos = await api.listMelos();
    renderAnlagenTable(melos.rows || []);
  } catch (e) {
    showError(e.message);
  } finally {
    showLoading(false);
  }
}

function renderAnlagenTable(melos) {
  const tbody = document.querySelector('#anlagen-table tbody');
  tbody.innerHTML = '';

  melos.filter(m => m.meloId?.includes('pv')).forEach(m => {
    const md = m.metadata || {};
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${m.name}</strong><br><small>${m.meloId}</small></td>
      <td>${(md.capacityKw/1000).toFixed(2)} MWp</td>
      <td>${md.installationType === 'ground-mounted' ? 'Freifläche' : 'Dach'}</td>
      <td>${md.commissioningDate || '—'}</td>
      <td>${md.postleitzahl || '—'}</td>
      <td><button class="outline" onclick="showAnlageDetail('${m.meloId}')">Details</button></td>
    `;
    tbody.appendChild(row);
  });
}

async function showAnlageDetail(meloId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('anlagen').classList.add('active');
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

  const date = '2026-05-12';
  const data = await api.getTimeseries(meloId, '1-0:2.7.0', `${date}T00:00:00Z`, `${date}T23:59:59Z`);
  
  const detail = document.getElementById('anlage-detail');
  detail.style.display = 'block';
  detail.innerHTML = `
    <h3>Detailansicht ${meloId}</h3>
    <div style="height:300px;">
      <canvas id="detail-chart"></canvas>
    </div>
  `;
  renderChart('detail-chart', data);
}

function initPruefung() {
  document.getElementById('pruefung-form').onsubmit = async (e) => {
    e.preventDefault();
    const location = document.getElementById('pruefung-ort').value;
    const capacity = parseFloat(document.getElementById('pruefung-kw').value);
    
    showLoading(true);
    try {
      const result = await api.validateConnection(location, capacity);
      renderPruefungResult(result);
    } catch (err) {
      showError(err.message);
    } finally {
      showLoading(false);
    }
  };
}

function renderPruefungResult(result) {
  const container = document.getElementById('pruefung-result');
  container.style.display = 'block';
  
  const status = result.overallGo ? 'go' : 'nogo';
  const statusText = result.overallGo ? 'Netzanschluss prinzipiell möglich' : 'Prüfung erforderlich';
  
  container.innerHTML = `
    <article class="pruefung-card ${status}">
      <h3>${statusText}</h3>
      <div class="score">Score: ${result.qualityScore || '—'}/100</div>
      
      <h4>Findings (${result.findings?.length || 0})</h4>
      <ul>
        ${(result.findings || []).map(f => `
          <li class="finding-${f.severity}">
            <strong>[${f.code}]</strong> ${f.message}
            <br><small>${f.rule || ''}</small>
          </li>
        `).join('')}
      </ul>
      
      ${result.metrics ? `
        <h4>Metriken</h4>
        <pre>${JSON.stringify(result.metrics, null, 2)}</pre>
      ` : ''}
    </article>
  `;
}

function initSettings() {
  document.getElementById('settings-form').onsubmit = (e) => {
    e.preventDefault();
    api.saveConfig({
      baseUrl: document.getElementById('cfg-url').value,
      tenantId: document.getElementById('cfg-tenant').value,
      token: document.getElementById('cfg-token').value
    });
    alert('Einstellungen gespeichert');
  };
}

function loadSettings() {
  document.getElementById('cfg-url').value = api.config.baseUrl;
  document.getElementById('cfg-tenant').value = api.config.tenantId;
  document.getElementById('cfg-token').value = api.config.token;
}

function showLoading(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}
