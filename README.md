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

## Premium + NovaPromo PRO

### Come funziona

| Piano | Crediti AI/mese | Creative Studio PRO |
|-------|-----------------|---------------------|
| **Free** | 30 | 3 prove benvenuto (`welcomeProCredits`) |
| **NovaPromo PRO** | 300 | Illimitato (nei limiti crediti) |
| **Admin** | ∞ | ∞ — nessun pagamento |

Nuovi utenti partono da **Free** con **3 crediti benvenuto** per Creative Studio PRO completo. Dopo l’esaurimento, Creative Studio si blocca con invito ad attivare PRO.

### Pagina e checkout

- `/premium` — confronto Free vs PRO, prezzi (9,99 €/mese · 99 €/anno)
- **Senza Stripe** → checkout mock (`/checkout/mock`) → attiva PRO per 30 giorni + 300 crediti
- **Con Stripe** → redirect a Stripe Checkout → webhook aggiorna Firestore

### Variabili Stripe (produzione reale)

```env
STRIPE_SECRET_KEY=sk_test_...   # usa sk_test_ in Test Mode — mai sk_live_ finché non sei pronto
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
STRIPE_DISABLE_MOCK=true        # opzionale: disabilita mock quando Stripe è pronto
```

Endpoint:
- Checkout: `POST /api/billing/create-checkout-session`
- Portal: `POST /api/billing/create-portal-session` (richiede `stripeCustomerId`)
- Webhook: `POST https://<BACKEND_URL>/api/billing/webhook`

Eventi webhook gestiti: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created|updated|deleted` (idempotenti via `stripe_webhook_events`).

Campi Firestore su `users/{uid}`: `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `stripeSubscriptionStatus`, `stripeCurrentPeriodEnd`, `cancelAtPeriodEnd`, `billingStatus`, `lastStripeEventId`.

### Test locale

```powershell
npm run test:accounts-plans
npm run test:stripe-subscriptions
npm run build
npm run dev
```

1. **Admin** (`ADMIN_EMAILS`) — Account mostra badge Admin, nessun checkout obbligatorio
2. **Free** — `/premium` visibile; Generator mostra crediti benvenuto; 3 pack PRO poi blocco
3. **Mock checkout** — Attiva PRO → `/checkout/success` → Account mostra piano PRO
4. **Stripe Test Mode** — con env `sk_test_` → Checkout Stripe → webhook attiva PRO → Account mostra “Gestisci abbonamento”
5. **IG/FB** — pubblicazione invariata (non legata al piano PRO)

### Passaggi manuali Stripe Dashboard (Test Mode)

1. Crea prodotto NovaPromo PRO + prezzi mensile/annuale
2. Webhook → `https://novapromo-backend.vercel.app/api/billing/webhook` con gli eventi sopra
3. Abilita Customer Portal (pagamenti, fatture, cancellazione)
4. Copia Price ID e webhook secret nelle env Vercel del **backend**
5. Redeploy backend — non passare a Live finché i test non sono ok

Vedi anche [docs/PREMIUM_AI.md](docs/PREMIUM_AI.md) per AI Studio e Creative Studio.
