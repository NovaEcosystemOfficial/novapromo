# Premium + AI Studio

## Variabili ambiente (backend Vercel)

| Variabile | Obbligatoria | Default | Descrizione |
|-----------|--------------|---------|-------------|
| `OPENAI_API_KEY` | No* | — | Chiave OpenAI — solo backend |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Modello chat completions |

\* Se manca: l'app non crasha; UI mostra **AI non configurata**.

Non committare `.env` / `.env.local`. Non esporre `OPENAI_API_KEY` nel frontend.

## Piani

| Piano | AI/mese | Stato |
|-------|---------|-------|
| Free | 3 | Default nuovi utenti |
| Premium | 300 | AI Studio completo |
| Business | 2000 | Predisposto — `businessActive: true` per attivare |

## Firestore schema

### `users/{docId}`

```json
{
  "uid": "local:desktop",
  "plan": "free",
  "aiCreditsUsedThisMonth": 0,
  "aiCreditsLimit": 3,
  "aiCreditsMonth": "2026-06",
  "businessActive": false,
  "createdAt": "...",
  "updatedAt": "..."
}
```

Doc ID: TikTok `openId` oppure `local-desktop` per sessione locale.

### `brands/nova-ecosystem`

Brand memory default (creato al primo utilizzo AI).

### `ai_generations/{id}`

Storico generazioni AI (input sanitizzato, output JSON).

## Attivare Premium manualmente (test)

Firebase Console → Firestore → `users` → documento utente:

```
plan: "premium"
aiCreditsLimit: 300
aiCreditsUsedThisMonth: 0
aiCreditsMonth: "2026-06"   // mese corrente YYYY-MM
```

Per Business attivo:

```
plan: "business"
businessActive: true
aiCreditsLimit: 2000
```

## Endpoint API

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/billing/status` | Piano, crediti, lock AI |
| GET | `/api/ai/status` | OpenAI configurata |
| POST | `/api/ai/generate-caption` | Caption |
| POST | `/api/ai/generate-hashtags` | Hashtag |
| POST | `/api/ai/generate-content-pack` | Pack completo |
| POST | `/api/ai/transform-content` | Varianti piattaforma |

Tutti gli endpoint AI richiedono sessione (`novapromo_session` o `novapromo_local`).

## Testare AI Studio

1. Aggiungi `OPENAI_API_KEY` al backend Vercel
2. Imposta utente `premium` in Firestore (o usa Free con ≤3 generazioni)
3. Apri **Generatore** → **Genera con AI**
4. Verifica salvataggio in `ai_generations`
5. Pagina `/premium` per crediti e confronto piani

```bash
node scripts/test-premium-ai.mjs
```

## Pagamenti (futuro)

Struttura pronta per Stripe:

- `GET /api/billing/status` → `paymentsEnabled: false`
- UI Premium con CTA disabilitata "Pagamenti in arrivo"
- Da implementare: webhook Stripe, `setUserPlan` su checkout completato
