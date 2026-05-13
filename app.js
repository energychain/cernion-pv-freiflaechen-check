/**
 * PV Freiflächen Express-Check — App Logic (ES5-compatible)
 */

var chartInstances = {};
var isDemoMode = false;

// ===== Startup =====
document.addEventListener('DOMContentLoaded', function() {
  initSettings();
  setupTabs();
  testConnection().then(function(connected) {
    if (!connected) {
      isDemoMode = true;
      var badge = document.getElementById('demo-badge');
      if (badge) badge.style.display = 'block';
    }
    loadDashboard();
  });
});

function testConnection() {
  return new Promise(function(resolve) {
    api.get('api/openapi.json')
      .then(function() { resolve(true); })
      .catch(function() { resolve(false); });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('nav[aria-label="breadcrumb"] button').forEach(function(btn) {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabId) btn.classList.add('active');
  });
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  var panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
  if (tabId === 'dashboard') loadDashboard();
  if (tabId === 'anlagen') loadAnlagen();
  if (tabId === 'pruefung') initPruefung();
  if (tabId === 'einstellungen') loadSettings();
}

function setupTabs() {
  document.querySelectorAll('nav[aria-label="breadcrumb"] button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchTab(btn.dataset.tab);
    });
  });
}

// ===== Dashboard =====
function loadDashboard() {
  showLoading(true);
  api.listMelos().then(function(melos) {
    renderDashboard(melos.rows || []);
    showLoading(false);
  }).catch(function(e) {
    showError(e.message);
    showLoading(false);
  });
}

function renderDashboard(melos) {
  var container = document.getElementById('dashboard-cards');
  if (!container) return;
  container.innerHTML = '';

  var pvMelos = melos.filter(function(m) {
    return (m.meloId && m.meloId.indexOf('pv') >= 0) ||
           (m.metadata && (m.metadata.installationType === 'ground-mounted' || m.metadata.installationType === 'roof-mounted'));
  });

  var gridMelo = melos.find(function(m) {
    return m.meloId && m.meloId.indexOf('anschluss') >= 0;
  });

  var totalCapacity = pvMelos.reduce(function(s, m) {
    return s + (m.metadata && m.metadata.capacityKw ? m.metadata.capacityKw : 0);
  }, 0);

  var avgYear = null;
  if (pvMelos.length > 0) {
    var years = pvMelos.map(function(m) {
      if (m.metadata && m.metadata.commissioningDate) {
        return new Date(m.metadata.commissioningDate).getFullYear();
      }
      return 0;
    }).filter(function(y) { return y > 0; });
    if (years.length > 0) {
      avgYear = Math.round(years.reduce(function(a, b) { return a + b; }, 0) / years.length);
    }
  }

  var kpiHtml = '<div class="grid kpi-grid">' +
    '<article class="kpi-card"><h3>Gesamtleistung</h3>' +
    '<p class="kpi-value">' + totalCapacity.toLocaleString('de-DE') + ' <span>kWp</span></p>' +
    '<small>' + pvMelos.length + ' Anlagen</small></article>' +
    '<article class="kpi-card"><h3>Standort</h3>' +
    '<p class="kpi-value">' + (pvMelos[0] && pvMelos[0].metadata ? pvMelos[0].metadata.location : '—') + '</p>' +
    '<small>PLZ ' + (pvMelos[0] && pvMelos[0].metadata ? pvMelos[0].metadata.postleitzahl : '—') + '</small></article>' +
    '<article class="kpi-card"><h3>Netzanschluss</h3>' +
    '<p class="kpi-value">' + (gridMelo && gridMelo.metadata ? gridMelo.metadata.connectionVoltage : '—') + '</p>' +
    '<small>Kapazität ' + (gridMelo && gridMelo.metadata ? (gridMelo.metadata.connectionCapacityKw / 1000).toFixed(1) : '—') + ' MW</small></article>' +
    '<article class="kpi-card"><h3>Ø Inbetriebnahme</h3>' +
    '<p class="kpi-value">' + (avgYear || '—') + '</p>' +
    '<small>' + pvMelos.length + ' Anlagen</small></article>' +
    '</div>';

  container.innerHTML = kpiHtml;

  // Timeseries chart container
  var tsDiv = document.createElement('div');
  tsDiv.id = 'ts-chart-container';
  tsDiv.innerHTML = '<h2>Tagesverlauf: ' + (pvMelos[0] ? pvMelos[0].name : 'PV-Anlage') + '</h2>' +
    '<div style="height:350px;"><canvas id="ts-chart"></canvas></div>';
  if (isDemoMode) {
    tsDiv.innerHTML += '<p style="color:#888;font-size:0.85rem;"><small>ℹ️ Demo-Modus: Zeigt synthetische, aber physikalisch plausible Daten (Sinus-Verlauf mit Kapazitätsfaktor ~75%)</small></p>';
  }
  container.appendChild(tsDiv);

  if (pvMelos.length > 0) {
    loadTimeseriesChart(pvMelos[0].meloId, '1-0:2.7.0', 'ts-chart');
  }
}

function loadTimeseriesChart(meloId, obis, canvasId) {
  var date = '2026-05-12';
  var from = date + 'T00:00:00Z';
  var to = date + 'T23:59:59Z';

  api.getTimeseries(meloId, obis, from, to).then(function(data) {
    renderChart(canvasId, data);
  }).catch(function(e) {
    console.error('Chart load failed:', e);
  });
}

function renderChart(canvasId, apiData) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var labels = (apiData.values || []).map(function(v) {
    return v.ts ? v.ts.slice(11, 16) : '';
  });
  var values = (apiData.values || []).map(function(v) {
    return v.value || 0;
  });

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
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
            label: function(ctx) { return ctx.parsed.y.toFixed(1) + ' kW'; }
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

// ===== Anlagen =====
function loadAnlagen() {
  showLoading(true);
  api.listMelos().then(function(melos) {
    renderAnlagenTable(melos.rows || []);
    showLoading(false);
  }).catch(function(e) {
    showError(e.message);
    showLoading(false);
  });
}

function renderAnlagenTable(melos) {
  var tbody = document.querySelector('#anlagen-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  melos.filter(function(m) {
    return m.meloId && m.meloId.indexOf('pv') >= 0;
  }).forEach(function(m) {
    var md = m.metadata || {};
    var row = document.createElement('tr');
    row.innerHTML = '<td><strong>' + m.name + '</strong><br><small>' + m.meloId + '</small></td>' +
      '<td>' + (md.capacityKw ? (md.capacityKw / 1000).toFixed(2) : '—') + ' MWp</td>' +
      '<td>' + (md.installationType === 'ground-mounted' ? 'Freifläche' : (md.installationType === 'roof-mounted' ? 'Dach' : '—')) + '</td>' +
      '<td>' + (md.commissioningDate || '—') + '</td>' +
      '<td>' + (md.postleitzahl || '—') + '</td>' +
      '<td><button class="outline" onclick="showAnlageDetail(\'' + m.meloId + '\')">Details</button></td>';
    tbody.appendChild(row);
  });
}

function showAnlageDetail(meloId) {
  switchTab('anlagen');
  var date = '2026-05-12';
  api.getTimeseries(meloId, '1-0:2.7.0', date + 'T00:00:00Z', date + 'T23:59:59Z').then(function(data) {
    var detail = document.getElementById('anlage-detail');
    if (!detail) return;
    detail.style.display = 'block';
    detail.innerHTML = '<h3>Detailansicht ' + meloId + '</h3>' +
      '<div style="height:300px;"><canvas id="detail-chart"></canvas></div>';
    renderChart('detail-chart', data);
  });
}

// ===== Prüfung =====
function initPruefung() {
  var form = document.getElementById('pruefung-form');
  if (!form || form._initialized) return;
  form._initialized = true;

  form.onsubmit = function(e) {
    e.preventDefault();
    var location = document.getElementById('pruefung-ort').value;
    var capacity = parseFloat(document.getElementById('pruefung-kw').value);

    showLoading(true);
    api.validateConnection(location, capacity).then(function(result) {
      renderPruefungResult(result);
      showLoading(false);
    }).catch(function(err) {
      showError(err.message);
      showLoading(false);
    });
  };
}

function renderPruefungResult(result) {
  var container = document.getElementById('pruefung-result');
  if (!container) return;
  container.style.display = 'block';

  var status = result.overallGo ? 'go' : 'nogo';
  var statusText = result.overallGo ? 'Netzanschluss prinzipiell möglich' : 'Prüfung erforderlich';

  var findingsHtml = (result.findings || []).map(function(f) {
    var sevClass = 'finding-info';
    if (f.severity === 'warning') sevClass = 'finding-warning';
    if (f.severity === 'error') sevClass = 'finding-error';
    return '<li class="' + sevClass + '">' +
      '<strong>[' + f.code + ']</strong> ' + f.message +
      '<br><small>' + (f.rule || '') + '</small>' +
      '</li>';
  }).join('');

  var metricsHtml = '';
  if (result.metrics) {
    metricsHtml = '<h4>Metriken</h4><pre>' + JSON.stringify(result.metrics, null, 2) + '</pre>';
  }

  container.innerHTML = '<article class="pruefung-card ' + status + '">' +
    '<h3>' + statusText + '</h3>' +
    '<div class="score">Score: ' + (result.qualityScore || '—') + '/100</div>' +
    '<h4>Findings (' + (result.findings ? result.findings.length : 0) + ')</h4>' +
    '<ul>' + findingsHtml + '</ul>' +
    metricsHtml +
    '</article>';
}

// ===== Settings =====
function initSettings() {
  var form = document.getElementById('settings-form');
  if (!form || form._initialized) return;
  form._initialized = true;

  form.onsubmit = function(e) {
    e.preventDefault();
    api.saveConfig({
      baseUrl: document.getElementById('cfg-url').value,
      tenantId: document.getElementById('cfg-tenant').value,
      token: document.getElementById('cfg-token').value
    });
    alert('Einstellungen gespeichert');
    testConnection().then(function(connected) {
      if (!connected) {
        isDemoMode = true;
        document.getElementById('demo-badge').style.display = 'block';
      } else {
        isDemoMode = false;
        document.getElementById('demo-badge').style.display = 'none';
      }
    });
  };
}

function loadSettings() {
  document.getElementById('cfg-url').value = api.config.baseUrl;
  document.getElementById('cfg-tenant').value = api.config.tenantId;
  document.getElementById('cfg-token').value = api.config.token;
}

// ===== Utils =====
function showLoading(show) {
  var el = document.getElementById('loading');
  if (el) el.style.display = show ? 'block' : 'none';
}

function showError(msg) {
  var el = document.getElementById('error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(function() { el.style.display = 'none'; }, 5000);
}
