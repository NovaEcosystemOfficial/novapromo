# NovaPromo AutoPublisher

Web app autonoma per generare, programmare e pubblicare contenuti su **Instagram**.  
**TikTok** e **Electron/EXE** sono in pausa.

## Sviluppo locale (web)

```powershell
cd novapromo-autopublisher
copy .env.local.example .env.local
# Compila META_APP_ID, META_APP_SECRET, SESSION_SECRET, ENCRYPTION_KEY
npm install
npm run dev
```

Apri `http://localhost:5173/dashboard` — il frontend fa proxy verso il backend su `127.0.0.1:3001`.

## Deploy su Vercel (solo frontend — fase 1)

Il backend/API sarà un **secondo progetto Vercel** separato (fase 2).

### Impostazioni progetto Vercel

| Campo | Valore |
|-------|--------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite (o Other) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` (default) |

Non usare Experimental Services né deploy multiservizio. Il `vercel.json` alla root è stato rimosso; in `frontend/vercel.json` c’è solo il rewrite SPA.

### Variabili ambiente (fase 1)

| Variabile | Valore | Obbligatoria |
|-----------|--------|--------------|
| `VITE_DEMO_MODE` | `true` | **Sì** (finché il backend non è deployato) |

Con `VITE_DEMO_MODE=true` l'app funziona senza API: login, dashboard e account sono accessibili in modalità demo.

Quando collegherai il backend, imposta `VITE_DEMO_MODE=false` e aggiungi:

- `VITE_API_URL` = URL del secondo progetto API (es. `https://novapromo-api.vercel.app`)

### Fase 2 (dopo)

Deploy separato della cartella `api/` + `backend/` con il proprio `vercel.json`.

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Dev web locale (backend + Vite) |
| `npm run build` | Build frontend per Vercel |
| `npm run dev:electron` | In pausa (solo messaggio) |

## Architettura web

- **Frontend:** React + Vite → `frontend/dist`
- **API:** Express in `api/index.js` (serverless Vercel)
- **OAuth Instagram:** `GET /api/oauth/instagram/start` → Meta → `GET /api/oauth/instagram/callback`
- **Post-OAuth redirect:** `https://<APP_URL>/accounts`

## Note database su Vercel

Su Vercel il backend usa SQLite in `/tmp` (effimero). Per persistenza account Instagram in produzione, configura un database esterno (es. Turso/Postgres) in un secondo momento.

## Licenza

Private — NovaPromo

## Premium + AI Studio

Vedi [docs/PREMIUM_AI.md](docs/PREMIUM_AI.md) per:

- Variabili `OPENAI_API_KEY` / `OPENAI_MODEL`
- Piani Free / Premium / Business e limiti AI
- Attivazione manuale Premium in Firestore
- Test AI Studio e pagamenti futuri
