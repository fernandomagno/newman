const express = require('express');
const multer = require('multer');
const newman = require('newman');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { generateReport } = require('./reportTemplate');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const REPORTS_DIR = path.join(__dirname, 'reports');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const COLLECTIONS_DIR = path.join(DATA_DIR, 'collections');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const COLLECTIONS_FILE = path.join(DATA_DIR, 'collections.json');

// garante que as pastas e os arquivos de dados existam
[DATA_DIR, REPORTS_DIR, UPLOADS_DIR, COLLECTIONS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, '[]', 'utf-8');
if (!fs.existsSync(COLLECTIONS_FILE)) fs.writeFileSync(COLLECTIONS_FILE, '[]', 'utf-8');

const upload = multer({ dest: UPLOADS_DIR });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/reports', express.static(REPORTS_DIR));

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

function readCollections() {
  try {
    return JSON.parse(fs.readFileSync(COLLECTIONS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeCollections(collections) {
  fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(collections, null, 2), 'utf-8');
}

function cleanupFiles(files) {
  files.filter(Boolean).forEach((f) => fs.unlink(f.path, () => {}));
}

// remove o BOM que alguns editores/exportadores adicionam no início do arquivo
function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

// lista o historico, mais recente primeiro
app.get('/api/history', (req, res) => {
  const history = readHistory().sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(history);
});

// detalhe de uma execucao especifica
app.get('/api/history/:id', (req, res) => {
  const item = readHistory().find((h) => h.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Execução não encontrada' });
  res.json(item);
});

// lista as collections salvas, mais recente primeiro
app.get('/api/collections', (req, res) => {
  const collections = readCollections().sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  res.json(collections);
});

// exclui uma collection salva e seus arquivos
app.delete('/api/collections/:id', (req, res) => {
  const collections = readCollections();
  const collectionIndex = collections.findIndex((collection) => collection.id === req.params.id);
  if (collectionIndex === -1) {
    return res.status(404).json({ error: 'Collection não encontrada' });
  }

  const [collection] = collections.splice(collectionIndex, 1);
  const folder = path.join(COLLECTIONS_DIR, collection.id);
  try {
    fs.rmSync(folder, { recursive: true, force: true });
    writeCollections(collections);
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao excluir a collection: ' + err.message });
  }

  res.json({ deleted: collection.id });
});

// salva uma nova collection (e ambiente opcional) para uso futuro
app.post(
  '/api/collections',
  upload.fields([
    { name: 'collection', maxCount: 1 },
    { name: 'environment', maxCount: 1 },
  ]),
  (req, res) => {
    const collectionFile = req.files?.collection?.[0];
    if (!collectionFile) {
      return res.status(400).json({ error: 'É necessário enviar uma collection do Postman (.json)' });
    }
    const environmentFile = req.files?.environment?.[0];
    const customName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

    let collectionJson;
    let environmentJson;
    try {
      collectionJson = readJsonFile(collectionFile.path);
      if (environmentFile) {
        environmentJson = readJsonFile(environmentFile.path);
      }
    } catch (err) {
      cleanupFiles([collectionFile, environmentFile]);
      return res.status(400).json({ error: 'Arquivo JSON inválido: ' + err.message });
    }

    const id = randomUUID();
    const folder = path.join(COLLECTIONS_DIR, id);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'collection.json'), JSON.stringify(collectionJson), 'utf-8');
    if (environmentJson) {
      fs.writeFileSync(path.join(folder, 'environment.json'), JSON.stringify(environmentJson), 'utf-8');
    }
    cleanupFiles([collectionFile, environmentFile]);

    const entry = {
      id,
      name: customName || collectionJson.info?.name || 'Collection sem nome',
      environmentName: environmentJson?.name || null,
      hasEnvironment: Boolean(environmentJson),
      addedAt: new Date().toISOString(),
    };

    const collections = readCollections();
    collections.push(entry);
    writeCollections(collections);

    res.json({ entry });
  }
);

// executa uma collection previamente salva, a partir do seu id
app.post('/api/run', (req, res) => {
  const { collectionId } = req.body || {};
  if (!collectionId) {
    return res.status(400).json({ error: 'Selecione uma collection para executar' });
  }

  const collections = readCollections();
  const meta = collections.find((c) => c.id === collectionId);
  if (!meta) {
    return res.status(404).json({ error: 'Collection não encontrada' });
  }

  const folder = path.join(COLLECTIONS_DIR, collectionId);
  let collectionJson;
  let environmentJson;
  try {
    collectionJson = readJsonFile(path.join(folder, 'collection.json'));
    if (meta.hasEnvironment) {
      environmentJson = readJsonFile(path.join(folder, 'environment.json'));
    }
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao ler a collection salva: ' + err.message });
  }

  const id = randomUUID();
  const reportFileName = `${id}.html`;
  const reportPath = path.join(REPORTS_DIR, reportFileName);
  const startedAt = new Date();
  const collectionName = collectionJson.info?.name || meta.name;

  newman.run(
    {
      collection: collectionJson,
      environment: environmentJson,
      reporters: ['cli'],
    },
    (err, summary) => {
      const stats = summary?.run?.stats;
      const hasFailures = summary?.run?.failures?.length > 0;
      const endpoints = (summary?.run?.executions || []).map((execution, index) => {
        const assertions = Array.isArray(execution.assertions) ? execution.assertions : [];
        const failedAssertions = assertions
          .filter((assertion) => assertion.error)
          .map((assertion) => ({
            name: assertion.assertion || 'Assertion',
            message: assertion.error.message || 'Falha na assertion',
          }));
        const parent = execution.item && typeof execution.item.parent === 'function'
          ? execution.item.parent()
          : null;
        const groupName = !parent || parent.constructor?.name === 'Collection'
          ? 'UNGROUPED'
          : parent.name || 'UNGROUPED';
        const response = execution.response;

        let url = '';
        try {
          url = (execution.request?.url?.toString() || '').replace(/^https?:\/\//, '');
        } catch {
          // Mantem a URL vazia se o request nao puder ser serializado.
        }

        return {
          groupName,
          name: execution.item?.name || `Request ${index + 1}`,
          method: execution.request?.method || 'GET',
          url,
          statusCode: response ? response.code : 'ERR',
          codeGood: Boolean(response && response.code >= 200 && response.code < 400),
          status: response?.status || null,
          responseTime: response?.responseTime ?? null,
          passed: !execution.requestError && failedAssertions.length === 0,
          failedAssertions,
          error: execution.requestError?.message || null,
        };
      });
      const runFailures = summary?.run?.failures || [];
      const timings = summary?.run?.timings || {};
      const reportStartedAt = timings.started ? new Date(timings.started) : startedAt;
      const completedAt = timings.completed ? new Date(timings.completed) : new Date();
      let reportGenerated = false;

      if (summary && !err) {
        try {
          const html = generateReport({ summary, collectionName, startedAt });
          fs.writeFileSync(reportPath, html, 'utf-8');
          reportGenerated = true;
        } catch (reportErr) {
          console.error('Falha ao gerar relatório:', reportErr);
        }
      }

      const entry = {
        id,
        collectionId,
        date: startedAt.toISOString(),
        collectionName,
        environmentName: meta.environmentName,
        status: err ? 'error' : hasFailures ? 'failed' : 'success',
        reportFile: reportGenerated ? reportFileName : null,
        stats: stats
          ? {
              requests: stats.requests.total,
              assertions: stats.assertions.total,
              failedAssertions: stats.assertions.failed,
              testScripts: stats.testScripts ? stats.testScripts.total : 0,
              avgLatency: Math.round(timings.responseAverage || 0),
              failuresCount: runFailures.length,
            }
          : null,
        endpoints,
        failures: runFailures.map((failure) => ({
          title: failure.source?.name || failure.error?.name || 'Assertion falhou',
          message: failure.error?.message || 'Erro desconhecido',
          meta: failure.error?.test || failure.error?.name || '',
        })),
        timings: {
          started: reportStartedAt.toISOString(),
          completed: completedAt.toISOString(),
          durationMs: completedAt.getTime() - reportStartedAt.getTime(),
        },
        error: err ? err.message : null,
      };

      const history = readHistory();
      history.push(entry);
      writeHistory(history);

      if (err) {
        return res.status(500).json({ error: err.message, entry });
      }
      res.json({ entry });
    }
  );
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Painel disponível em http://localhost:${PORT}`);
});
