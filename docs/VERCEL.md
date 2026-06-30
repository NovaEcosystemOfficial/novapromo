# NovaPromo — Import variabili su Vercel

File generati automaticamente (non committati, contengono segreti):

| File | Progetto Vercel | Root directory |
|------|-----------------|----------------|
| `.env.vercel.backend` | `novapromo-backend` | repo root |
| `frontend/.env.vercel` | `novapromo` | `frontend/` |

## Rigenerare i file

```bash
npm run generate:vercel-env
```

Legge `.env.local` e `frontend/.env.local`.

## Import in dashboard

Per ogni progetto Vercel:

1. **Settings** → **Environment Variables**
2. **Import .env** (o *Bulk Edit*)
3. Seleziona il file corrispondente
4. Ambiente: **Production** e **Preview**
5. **Save** → **Redeploy**

### Backend (`novapromo-backend`)

Variabili critiche:
- `FIREBASE_*` + `DATA_STORE=firebase`
- `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` (OAuth invariato)
- `SESSION_SECRET`, `ENCRYPTION_KEY`
- `FRONTEND_URL`, `BACKEND_URL`, `META_REDIRECT_URI`

### Frontend (`novapromo`)

- Tutte le `VITE_FIREBASE_*`
- `VITE_DEMO_MODE=false`

## Verifica post-deploy

```bash
curl https://novapromo-backend.vercel.app/api/config/features
```

Atteso: `"dataStore":"firestore"`, `"storageConfigured":true`
