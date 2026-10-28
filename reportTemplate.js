// Gera relatorios HTML no estilo "Command Center" (Horizon x Jarvis) a partir do summary do Newman.
// O visual segue os mesmos tokens usados no painel (public/design-tokens.css), mantendo o relatorio autossuficiente.

const REPORT_CSS = `:root{--bg-base:#05080d;--bg-surface:#080d14;--bg-elevated:#0b121b;--surface-soft:rgba(255,255,255,.025);--surface-hover:rgba(255,255,255,.045);--text-primary:#f2f7fa;--text-secondary:#9aa8b5;--text-muted:#5f6d79;--accent-primary:#53e5ff;--accent-secondary:#7cf7d4;--accent-warm:#d5b66f;--border-subtle:rgba(120,220,255,.10);--border-active:rgba(120,220,255,.30);--success:#67f5b5;--warning:#f2c96d;--danger:#ff7070;--font-ui:"Bahnschrift","Trebuchet MS",sans-serif;--font-mono:"Cascadia Code",Consolas,monospace;--radius-sm:2px;--shadow-panel:0 0 0 1px rgba(100,220,255,.04),0 12px 40px rgba(0,0,0,.25)}
*{box-sizing:border-box}html{background:var(--bg-base)}
body{margin:0;color:var(--text-primary);font-family:var(--font-ui);letter-spacing:.02em;background-color:var(--bg-base);background-image:linear-gradient(rgba(100,200,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(100,200,255,.025) 1px,transparent 1px),radial-gradient(circle at 82% 0,rgba(83,229,255,.08),transparent 27%),radial-gradient(circle at 8% 70%,rgba(124,247,212,.035),transparent 25%);background-size:48px 48px,48px 48px,auto,auto;min-height:100vh}
.wrap{width:min(1240px,calc(100% - 36px));margin:auto;padding:28px 0 68px}
.system-label{font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.topline{display:flex;justify-content:space-between;align-items:center;color:var(--text-secondary);border-bottom:1px solid var(--border-subtle);padding-bottom:12px}
.signal-dot{display:inline-block;width:6px;height:6px;margin:0 8px 1px 0;border-radius:50%;background:var(--success);box-shadow:0 0 10px rgba(103,245,181,.7)}
.signal{color:var(--accent-primary)}
.hero{display:flex;justify-content:space-between;gap:28px;align-items:end;padding:42px 0 30px;flex-wrap:wrap}
.eyebrow{color:var(--accent-warm);margin-bottom:6px}
.hero h1{font-size:clamp(30px,5vw,54px);line-height:.98;margin:12px 0;color:var(--text-primary);text-transform:uppercase;letter-spacing:.03em;text-shadow:0 0 28px rgba(83,229,255,.12)}
.hero p{color:var(--text-secondary);margin:14px 0 0;max-width:620px}
.status{min-width:238px;border:1px solid currentColor;padding:18px 20px;position:relative;background:rgba(11,18,27,.86);box-shadow:var(--shadow-panel)}
.status:after{content:"";position:absolute;right:-1px;top:-1px;width:24px;height:24px;border-top:2px solid currentColor;border-right:2px solid currentColor}
.status.ok{color:var(--success)}
.status.danger{color:var(--danger)}
.status-label{font:12px var(--font-mono);letter-spacing:.12em}
.status-value{display:block;color:var(--text-primary);font-size:21px;font-weight:bold;margin-top:9px}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:34px}
.metric,.service-block,.failures{background:linear-gradient(135deg,rgba(11,18,27,.96),rgba(8,13,20,.92));border:1px solid var(--border-subtle);box-shadow:var(--shadow-panel);border-radius:var(--radius-sm)}
.metric,.service-block,.failures{position:relative}
.metric:before,.metric:after,.service-block:before,.service-block:after,.failures:before,.failures:after{content:"";position:absolute;width:12px;height:12px;pointer-events:none}
.metric:before,.service-block:before,.failures:before{top:-1px;left:-1px;border-top:1px solid var(--accent-primary);border-left:1px solid var(--accent-primary);opacity:.5}
.metric:after,.service-block:after,.failures:after{right:-1px;bottom:-1px;border-right:1px solid var(--accent-primary);border-bottom:1px solid var(--accent-primary);opacity:.35}
.metric{padding:20px;min-height:112px;overflow:hidden}
.metric-label{display:block;color:var(--text-secondary);font:11px var(--font-mono);text-transform:uppercase;letter-spacing:.12em}
.metric-value{display:block;font:700 30px var(--font-mono);margin-top:15px;color:var(--accent-primary)}
.metric-value.alert{color:var(--danger)}
.section-title{display:flex;align-items:center;gap:14px;margin:0 0 12px;color:var(--text-secondary);font:12px var(--font-mono);letter-spacing:.16em;text-transform:uppercase}
.section-title:after{content:"";height:1px;background:linear-gradient(90deg,var(--border-subtle),transparent);flex:1}
.service-block{margin:0 0 18px;padding:20px}
.service-heading{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border-subtle);padding-bottom:15px;margin-bottom:6px}
.service-heading h2{font-size:16px;letter-spacing:.08em;text-transform:uppercase;margin:0;color:var(--text-primary)}
.service-index{color:var(--accent-warm);font:15px var(--font-mono)}
.service-count{margin-left:auto;color:var(--text-secondary);font:11px var(--font-mono)}
.check-row{display:grid;grid-template-columns:88px minmax(0,1fr) 70px 82px;align-items:center;gap:16px;padding:15px 4px;border-bottom:1px solid rgba(120,220,255,.06)}
.check-row:last-child{border-bottom:0}
.check-row:hover{background:var(--surface-hover)}
.check-state{font:11px var(--font-mono);color:var(--success)}
.check-row.failed .check-state{color:var(--danger)}
.state-dot,.pulse{display:inline-block;width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor;margin-right:8px}
.check-name{min-width:0}
.check-name strong{display:block;font-size:14px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.check-name small{display:block;color:var(--text-secondary);font:11px var(--font-mono);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.check-code{font:bold 14px var(--font-mono);text-align:center;padding:7px 5px;border:1px solid;border-radius:var(--radius-sm)}
.code-good{color:var(--success);border-color:rgba(103,245,181,.4);background:rgba(103,245,181,.05)}
.code-bad{color:var(--danger);border-color:rgba(255,112,112,.4);background:rgba(255,112,112,.05)}
.check-time{color:var(--text-secondary);font:12px var(--font-mono);text-align:right}
.failures{padding:20px;margin-top:32px;border-color:rgba(255,112,112,.25)}
.failure-card{border-left:2px solid var(--danger);padding:13px 16px;background:rgba(255,112,112,.04);margin-top:10px}
.failure-title{font-weight:bold;color:var(--text-primary)}
.failure-message{color:var(--danger);font:13px var(--font-mono);margin-top:8px}
.failure-meta{color:var(--text-secondary);font-size:12px;margin-top:8px}
.empty-state{color:var(--success);font:13px var(--font-mono);padding:16px 0}
.footer{display:flex;justify-content:space-between;color:var(--text-secondary);font:11px var(--font-mono);border-top:1px solid var(--border-subtle);margin-top:32px;padding-top:16px;letter-spacing:.05em}
a:focus-visible,button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:3px}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition-duration:.01ms!important;animation-duration:.01ms!important}}
@media(max-width:760px){.wrap{width:min(100% - 24px,1240px);padding-top:20px}
.hero{display:block;padding-top:30px}
.status{margin-top:26px}
.metrics{grid-template-columns:repeat(2,1fr)}
.metric{min-height:96px;padding:15px}
.metric-value{font-size:24px}
.service-block{padding:14px}
.check-row{grid-template-columns:64px minmax(0,1fr) 56px;gap:9px}
.check-time{display:none}
.check-name strong{font-size:13px}
.footer{display:block;line-height:2}
.footer span{display:block}
}`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function formatTimestamp(date) {
  return date.toISOString().replace('T', ' ').replace('Z', '') + ' UTC';
}

// agrupa as execucoes pela pasta do Postman (ou "UNGROUPED" quando o request esta na raiz da collection)
function buildGroups(executions) {
  const order = [];
  const map = new Map();

  executions.forEach((exec) => {
    const parent = exec.item && typeof exec.item.parent === 'function' ? exec.item.parent() : null;
    const isRoot = !parent || (parent.constructor && parent.constructor.name === 'Collection');
    const groupName = isRoot ? 'UNGROUPED' : parent.name || 'UNGROUPED';

    if (!map.has(groupName)) {
      map.set(groupName, []);
      order.push(groupName);
    }

    const failedAssertion = Array.isArray(exec.assertions) && exec.assertions.some((a) => a.error);
    const hasRequestError = Boolean(exec.requestError);
    const passed = !failedAssertion && !hasRequestError;

    const response = exec.response;
    const code = response ? response.code : 'ERR';
    const codeGood = Boolean(response && response.code >= 200 && response.code < 400);
    const time = response ? response.responseTime : null;

    let method = 'GET';
    let url = '';
    try {
      method = exec.request.method;
      url = exec.request.url.toString().replace(/^https?:\/\//, '');
    } catch {
      // request malformado ou nao disponivel: mantem valores padrao
    }

    map.get(groupName).push({
      name: exec.item ? exec.item.name : 'Request',
      method,
      url,
      code,
      codeGood,
      time,
      passed,
    });
  });

  return order.map((name) => ({ name, checks: map.get(name) }));
}

function buildFailures(runFailures) {
  return (runFailures || []).map((f) => ({
    title: (f.source && f.source.name) || (f.error && f.error.name) || 'Assertion falhou',
    message: (f.error && f.error.message) || 'Erro desconhecido',
    meta: (f.error && (f.error.test || f.error.name)) || '',
  }));
}

function renderGroups(groups) {
  return groups
    .map(
      (group) => `
  <section class="service-block">
    <div class="service-heading"><span class="service-index">//</span><h2>${escapeHtml(group.name)}</h2><span class="service-count">${group.checks.length} checks</span></div>
    <div class="checks">${group.checks
      .map(
        (check) => `
      <article class="check-row ${check.passed ? 'passed' : 'failed'}">
        <div class="check-state"><span class="state-dot"></span><span>${check.passed ? 'PASS' : 'FAIL'}</span></div>
        <div class="check-name"><strong>${escapeHtml(check.name)}</strong><small>${escapeHtml(check.method)} ${escapeHtml(check.url)}</small></div>
        <div class="check-code ${check.codeGood ? 'code-good' : 'code-bad'}">${escapeHtml(check.code)}</div>
        <div class="check-time">${check.time != null ? `${check.time} ms` : '—'}</div>
      </article>`
      )
      .join('')}</div>
  </section>`
    )
    .join('');
}

function renderFailures(failures) {
  if (!failures.length) {
    return '<div class="empty-state">No anomalies detected in the assertion matrix.</div>';
  }
  return failures
    .map(
      (f) => `
  <article class="failure-card">
    <div class="failure-title"><span class="pulse danger"></span>${escapeHtml(f.title)}</div>
    <div class="failure-message">${escapeHtml(f.message)}</div>
    <div class="failure-meta">${escapeHtml(f.meta)}</div>
  </article>`
    )
    .join('');
}

function generateReport({ summary, collectionName, startedAt }) {
  const timings = (summary.run && summary.run.timings) || {};
  const startDate = timings.started ? new Date(timings.started) : startedAt;
  const completedAt = timings.completed ? new Date(timings.completed) : new Date();

  const statsRaw = summary.run.stats;
  const failuresList = buildFailures(summary.run.failures);
  const stats = {
    requests: statsRaw.requests.total,
    assertionsTotal: statsRaw.assertions.total,
    assertionsFailed: statsRaw.assertions.failed,
    avgLatency: Math.round(timings.responseAverage || 0),
    failuresCount: failuresList.length,
  };

  const groups = buildGroups(summary.run.executions || []);
  const hasFailures = stats.failuresCount > 0;
  const statusClass = hasFailures ? 'danger' : 'ok';
  const statusText = hasFailures ? 'ANOMALY DETECTED' : 'SYSTEM NORMAL';
  const durationMs = completedAt.getTime() - startDate.getTime();

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(collectionName)} // Cyber Report</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<main class="wrap">
  <div class="topline system-label"><span><span class="signal-dot"></span><span class="signal">SYSTEM ONLINE</span> // TESTFULLY / NEURAL GATEWAY</span><span>${formatTimestamp(startDate)}</span></div>
  <header class="hero"><div><div class="eyebrow system-label">AUTOMATED HEALTH PROTOCOL // v2.0</div><h1>${escapeHtml(collectionName)}</h1><p>Telemetry report for service readiness across HML and PRD environments.</p></div><div class="status ${statusClass}"><span class="status-label system-label">RUN STATUS</span><span class="status-value">${statusText}</span></div></header>
  <section class="metrics">
    <div class="metric"><span class="metric-label">Requests</span><span class="metric-value">${stats.requests}</span></div>
    <div class="metric"><span class="metric-label">Assertions passed</span><span class="metric-value">${stats.assertionsTotal - stats.assertionsFailed} / ${stats.assertionsTotal}</span></div>
    <div class="metric"><span class="metric-label">Avg latency</span><span class="metric-value">${stats.avgLatency} ms</span></div>
    <div class="metric"><span class="metric-label">Failures</span><span class="metric-value${hasFailures ? ' alert' : ''}">${stats.failuresCount}</span></div>
  </section>
  <div class="section-title">SERVICE MATRIX <span>// LIVE CHECKS</span></div>
  ${renderGroups(groups)}
  <section class="failures"><div class="section-title">ANOMALY LOG <span>// ${failuresList.length} EVENTS</span></div>${renderFailures(failuresList)}</section>
  <footer class="footer"><span>START ${startDate.toISOString()}</span><span>END ${completedAt.toISOString()} // DURATION ${durationMs} ms</span></footer>
</main>
</body>
</html>`;
}

module.exports = { generateReport };
