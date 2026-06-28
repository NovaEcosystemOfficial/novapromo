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

## Deploy su Vercel

### 1. Crea il progetto Vercel

1. Vai su [vercel.com/new](https://vercel.com/new)
2. Importa il repository Git di **novapromo-autopublisher** (non NovaWeb)
3. Framework Preset: **Other**
4. Build Command: `npm run build` (già in `vercel.json`)
5. Output Directory: `frontend/dist` (già in `vercel.json`)
6. Install Command: `npm install`
7. Nome progetto consigliato: `novapromo` → URL `https://novapromo.vercel.app`

### 2. Variabili ambiente Vercel (Production)

| Variabile | Valore |
|-----------|--------|
| `APP_URL` | `https://novapromo.vercel.app` (o il dominio Vercel assegnato) |
| `META_APP_ID` | App ID da Meta Developers |
| `META_APP_SECRET` | App Secret da Meta Developers |
| `META_REDIRECT_URI` | `https://novapromo.vercel.app/api/oauth/instagram/callback` |
| `SESSION_SECRET` | Stringa random ≥ 32 caratteri |
| `ENCRYPTION_KEY` | Stringa random ≥ 32 caratteri |
| `TIKTOK_ENABLED` | `false` |
| `META_GRAPH_API_VERSION` | `v21.0` (opzionale) |

Non impostare `META_REDIRECT_URI` con `localhost` o `127.0.0.1` in produzione.

### 3. Meta Developers — Redirect URI

Registra **solo HTTPS** in Facebook Login → URI di reindirizzamento OAuth validi:

```
https://novapromo.vercel.app/api/oauth/instagram/callback
```

(Sostituisci con il tuo dominio Vercel se diverso.)

### 4. Test login Instagram

1. Deploy su Vercel
2. Apri `https://novapromo.vercel.app/accounts`
3. Clicca **Collega Instagram**
4. Autorizza su Meta → redirect a `/accounts?connected=instagram`

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
