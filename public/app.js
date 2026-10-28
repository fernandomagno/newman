function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function updateClock() {
  const clock = document.getElementById('clock');
  if (!clock) return;
  clock.textContent = new Date().toISOString().replace('T', ' ').replace('Z', '') + ' UTC';
}
updateClock();
setInterval(updateClock, 1000);

const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('active'));
    tabContents.forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

    if (btn.dataset.tab === 'run') loadCollections();
    if (btn.dataset.tab === 'dashboard') loadDashboard();
    if (btn.dataset.tab === 'history') loadHistory();
    if (btn.dataset.tab === 'reports') loadReports();
  });
});

document.getElementById('refresh-dashboard').addEventListener('click', loadDashboard);

const runForm = document.getElementById('run-form');
const playBtn = document.getElementById('play-btn');
const clearStatusBtn = document.getElementById('clear-status-btn');
const runStatus = document.getElementById('run-status');

clearStatusBtn.addEventListener('click', () => {
  runStatus.innerHTML = '';
});

runForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const selected = document.querySelector('input[name="collection"]:checked');
  if (!selected) {
    showStatus('Selecione uma collection antes de executar.', 'error');
    return;
  }

  playBtn.disabled = true;
  showStatus('RUNNING // Executando collection, aguarde...', 'running');

  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId: selected.value }),
    });
    const data = await res.json();

    if (!res.ok) {
      showStatus(`Erro ao executar: ${escapeHtml(data.error || 'erro desconhecido')}`, 'error');
    } else {
      const entry = data.entry;
      const statusLabel = entry.status === 'success' ? 'PASS' : entry.status === 'failed' ? 'FAILED' : 'ERROR';
      showStatus(
          `STATUS ${statusLabel} // Requisições: ${entry.stats?.requests ?? '-'}, ` +
          `Falhas de assertion: ${entry.stats?.failedAssertions ?? '-'}.`,
        entry.status
      );
    }
  } catch (err) {
    showStatus(`Falha de comunicação com o servidor: ${escapeHtml(err.message)}`, 'error');
  } finally {
    playBtn.disabled = false;
  }
});

function showStatus(message, kind) {
  const cls = kind === 'success' ? 'status-success' : kind === 'running' ? 'status-running' : 'status-error';
  runStatus.innerHTML = `<div class="status-box ${cls}">${message}</div>`;
}

async function loadCollections() {
  const list = document.getElementById('collections-list');
  const emptyMsg = document.getElementById('collections-empty');
  const count = document.getElementById('collections-count');
  const previouslySelected = document.querySelector('input[name="collection"]:checked')?.value;
  list.innerHTML = '';

  const res = await fetch('/api/collections');
  const collections = await res.json();
  count.textContent = collections.length;

  if (!collections.length) {
    emptyMsg.hidden = false;
    playBtn.disabled = true;
    return;
  }
  emptyMsg.hidden = true;
  playBtn.disabled = false;

  collections.forEach((item, index) => {
    const date = new Date(item.addedAt).toLocaleString('pt-BR');
    const label = document.createElement('label');
    label.className = 'collection-row';
    const checked = previouslySelected ? previouslySelected === item.id : index === 0;
    label.innerHTML = `
      <input class="collection-selector" type="radio" name="collection" value="${escapeHtml(item.id)}" ${checked ? 'checked' : ''} />
      <span class="collection-info">
        <strong class="col-name">${escapeHtml(item.name)}</strong>
        <span class="collection-details">
          <span class="col-meta">Adicionada em ${escapeHtml(date)}</span>
          <span class="col-environment">${item.hasEnvironment ? `🌐 ${escapeHtml(item.environmentName || 'Com ambiente')}` : '— Sem ambiente'}</span>
        </span>
      </span>
      <button type="button" class="btn-delete-collection" title="Excluir collection">Excluir</button>
    `;
    label.querySelector('.btn-delete-collection').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteCollection(item.id, item.name);
    });
    list.appendChild(label);
  });
}

async function deleteCollection(id, name) {
  if (!window.confirm(`Excluir a collection "${name}"? Os arquivos salvos serão removidos.`)) return;

  try {
    const res = await fetch(`/api/collections/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      showStatus(`Erro ao excluir: ${escapeHtml(data.error || 'erro desconhecido')}`, 'error');
      return;
    }

    showStatus('PASS // Collection excluída com sucesso.', 'success');
    loadCollections();
  } catch (err) {
    showStatus(`Falha de comunicação com o servidor: ${escapeHtml(err.message)}`, 'error');
  }
}

const addCollectionForm = document.getElementById('add-collection-form');
const saveCollectionBtn = document.getElementById('save-collection-btn');
const addStatus = document.getElementById('add-status');

addCollectionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const collectionInput = document.getElementById('new-collection-file');
  const collectionNameInput = document.getElementById('new-collection-name');
  const environmentInput = document.getElementById('new-environment-file');

  if (!collectionInput.files.length) {
    showAddStatus('Selecione o arquivo da collection antes de salvar.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('collection', collectionInput.files[0]);
  if (collectionNameInput.value.trim()) {
    formData.append('name', collectionNameInput.value.trim());
  }
  if (environmentInput.files.length) {
    formData.append('environment', environmentInput.files[0]);
  }

  saveCollectionBtn.disabled = true;
  showAddStatus('Salvando collection...', 'running');

  try {
    const res = await fetch('/api/collections', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      showAddStatus(`Erro ao salvar: ${escapeHtml(data.error || 'erro desconhecido')}`, 'error');
    } else {
      showAddStatus(`PASS // Collection "${escapeHtml(data.entry.name)}" salva com sucesso.`, 'success');
      addCollectionForm.reset();
      loadCollections();
    }
  } catch (err) {
    showAddStatus(`Falha de comunicação com o servidor: ${escapeHtml(err.message)}`, 'error');
  } finally {
    saveCollectionBtn.disabled = false;
  }
});

function showAddStatus(message, kind) {
  const cls = kind === 'success' ? 'status-success' : kind === 'running' ? 'status-running' : 'status-error';
  addStatus.innerHTML = `<div class="status-box ${cls}">${message}</div>`;
}

async function hydrateDashboardRunFromReport(item) {
  if (Array.isArray(item.endpoints) && Array.isArray(item.failures) && item.timings) return;
  if (!item.reportFile) return;

  try {
    const res = await fetch(`/reports/${encodeURIComponent(item.reportFile)}`);
    if (!res.ok) return;
    const report = new DOMParser().parseFromString(await res.text(), 'text/html');
    const endpoints = [];

    report.querySelectorAll('.service-block').forEach((group) => {
      const groupName = group.querySelector('.service-heading h2')?.textContent.trim() || 'UNGROUPED';
      group.querySelectorAll('.check-row').forEach((row) => {
        const requestDetails = row.querySelector('.check-name small')?.textContent.trim() || '';
        const requestMatch = requestDetails.match(/^(\S+)\s+([\s\S]+)$/);
        const codeText = row.querySelector('.check-code')?.textContent.trim() || 'ERR';
        const timeText = row.querySelector('.check-time')?.textContent.trim() || '';
        const timeMatch = timeText.match(/^(\d+)\s*ms$/);

        endpoints.push({
          groupName,
          name: row.querySelector('.check-name strong')?.textContent.trim() || 'Request',
          method: requestMatch?.[1] || 'GET',
          url: requestMatch?.[2] || '',
          statusCode: /^\d+$/.test(codeText) ? Number(codeText) : codeText,
          codeGood: row.querySelector('.check-code')?.classList.contains('code-good') || false,
          responseTime: timeMatch ? Number(timeMatch[1]) : null,
          passed: row.classList.contains('passed'),
        });
      });
    });

    if (!report.querySelector('.service-block')) return;
    item.endpoints = endpoints;
    item.failures = [...report.querySelectorAll('.failure-card')].map((failure) => ({
      title: failure.querySelector('.failure-title')?.textContent.trim() || 'Assertion falhou',
      message: failure.querySelector('.failure-message')?.textContent.trim() || 'Erro desconhecido',
      meta: failure.querySelector('.failure-meta')?.textContent.trim() || '',
    }));

    const reportMetrics = new Map([...report.querySelectorAll('.metric')].map((metric) => [
      metric.querySelector('.metric-label')?.textContent.trim(),
      metric.querySelector('.metric-value')?.textContent.trim(),
    ]));
    const assertionMatch = reportMetrics.get('Assertions passed')?.match(/^(\d+)\s*\/\s*(\d+)$/);
    const latencyMatch = reportMetrics.get('Avg latency')?.match(/^(\d+)\s*ms$/);
    item.stats = {
      ...item.stats,
      requests: Number(reportMetrics.get('Requests')) || item.stats?.requests || endpoints.length,
      assertions: assertionMatch ? Number(assertionMatch[2]) : item.stats?.assertions,
      failedAssertions: assertionMatch
        ? Number(assertionMatch[2]) - Number(assertionMatch[1])
        : item.stats?.failedAssertions,
      avgLatency: latencyMatch ? Number(latencyMatch[1]) : null,
      failuresCount: Number(reportMetrics.get('Failures')) || 0,
    };

    const timingSpans = report.querySelectorAll('.footer span');
    const started = timingSpans[0]?.textContent.trim().replace(/^START\s+/, '');
    const endMatch = timingSpans[1]?.textContent.trim().match(/^END\s+(.+?)\s+\/\/\s+DURATION\s+(\d+)\s+ms$/);
    if (started && endMatch) {
      item.timings = {
        started,
        completed: endMatch[1],
        durationMs: Number(endMatch[2]),
      };
    }
  } catch {
    // Keeps the history fallback when a saved report cannot be loaded.
  }
}

async function loadDashboard() {
  const collections = document.getElementById('dashboard-collections');
  const emptyMsg = document.getElementById('dashboard-empty');
  collections.innerHTML = '';
  emptyMsg.hidden = true;

  try {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error('Não foi possível carregar o histórico.');
    const history = await res.json();

    const latestSmokeTest = history
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .find((item) => item.collectionName?.trim().toLowerCase() === 'smoketest');
    const latestRuns = latestSmokeTest ? [latestSmokeTest] : [];
    await Promise.all(latestRuns.map(hydrateDashboardRunFromReport));

    if (!latestRuns.length) {
      emptyMsg.textContent = 'Nenhuma execução registrada ainda.';
      emptyMsg.hidden = false;
      return;
    }

    const rows = latestRuns.flatMap((item) => {
      const endpoints = Array.isArray(item.endpoints) ? item.endpoints : [];
      if (!endpoints.length) {
        return [{
          passed: item.status === 'success',
          apiName: item.collectionName || 'API sem nome',
          serviceTitle: 'Detalhes indisponíveis',
        }];
      }

      return endpoints.map((endpoint) => ({
        passed: endpoint.passed,
        apiName: endpoint.name || 'Request sem nome',
        serviceTitle: endpoint.groupName || 'Serviço sem título',
      }));
    });

    collections.innerHTML = `
      <div class="dashboard-table-wrap">
        <table class="dashboard-table">
          <thead>
            <tr><th scope="col">Status</th><th scope="col">Nome da API</th><th scope="col">Título do serviço</th></tr>
          </thead>
          <tbody>${rows.map((row) => `
            <tr>
              <td><span class="dashboard-status-icon ${row.passed ? 'is-success' : 'is-failed'}" role="img" aria-label="${row.passed ? 'Sucesso' : 'Falha'}">${row.passed ? '&#10003;' : '&#10005;'}</span></td>
              <td>${escapeHtml(row.apiName)}</td>
              <td>${escapeHtml(row.serviceTitle)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  } catch (err) {
    emptyMsg.textContent = err.message || 'Falha ao carregar o dashboard.';
    emptyMsg.hidden = false;
  }
}

async function loadHistory() {
  const list = document.getElementById('history-list');
  const emptyMsg = document.getElementById('history-empty');
  list.innerHTML = '';

  const res = await fetch('/api/history');
  const history = await res.json();

  if (!history.length) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  history.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'check-row';
    const date = new Date(item.date).toLocaleString('pt-BR');
    const badgeClass = `badge-${item.status}`;
    const statusText = item.status === 'success' ? 'sucesso' : item.status === 'failed' ? 'falhou' : 'erro';

    row.innerHTML = `
      <span>${escapeHtml(date)}</span>
      <span>${escapeHtml(item.collectionName)}</span>
      <span>${escapeHtml(item.environmentName || '-')}</span>
      <span><span class="badge ${badgeClass}">${statusText}</span></span>
      <span>${item.stats?.requests ?? '-'}</span>
      <span>${item.stats?.failedAssertions ?? '-'}</span>
      <span>${
        item.reportFile
          ? `<a class="report-link" href="/reports/${encodeURIComponent(item.reportFile)}" target="_blank">Ver relatório</a>`
          : '-'
      }</span>
    `;
    list.appendChild(row);
  });
}

async function loadReports() {
  const list = document.getElementById('reports-list');
  const emptyMsg = document.getElementById('reports-empty');
  list.innerHTML = '';

  const res = await fetch('/api/history');
  const history = await res.json();
  const withReports = history.filter((item) => item.reportFile);

  if (!withReports.length) {
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  withReports.forEach((item) => {
    const date = new Date(item.date).toLocaleString('pt-BR');
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${escapeHtml(item.collectionName)} — ${escapeHtml(date)}</span>
      <a class="report-link" href="/reports/${encodeURIComponent(item.reportFile)}" target="_blank">Abrir relatório ↗</a>
    `;
    list.appendChild(li);
  });
}

// carrega os dados assim que o painel abre, para a aba "Executar" ficar pronta
loadCollections();
loadHistory();
