export function buildErrorPageDataUrl(targetUrl, detail) {
  const safeUrl = String(targetUrl || '').replace(/</g, '&lt;');
  const safeDetail = String(detail || 'Errore sconosciuto').replace(/</g, '&lt;');

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NovaPromo — Errore avvio</title>
  <style>
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: #0f0f14;
      color: #e8e8ef;
      padding: 2.5rem;
      line-height: 1.5;
    }
    h1 { color: #f87171; margin-top: 0; }
    code, pre {
      background: #1a1a24;
      border-radius: 8px;
      font-size: 0.9rem;
    }
    code { padding: 0.15rem 0.4rem; }
    pre {
      padding: 1rem;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    ol { padding-left: 1.25rem; }
    li { margin-bottom: 0.35rem; }
  </style>
</head>
<body>
  <h1>Impossibile caricare NovaPromo</h1>
  <p>Il frontend non è raggiungibile all'indirizzo:</p>
  <p><code>${safeUrl}</code></p>
  <pre>${safeDetail}</pre>
  <h2>Cosa fare</h2>
  <ol>
    <li>Chiudi questa finestra e tutti i terminali NovaPromo</li>
    <li>Esegui <code>npm run dev:electron</code></li>
    <li>Attendi che Vite mostri <code>Local: http://localhost:5173</code></li>
    <li>Verifica che il backend risponda su <code>http://localhost:3001/api/health</code></li>
  </ol>
</body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}
