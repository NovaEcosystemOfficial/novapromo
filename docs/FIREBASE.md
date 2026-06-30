# NovaPromo — Firebase (Firestore + Storage)

Progetto Firebase: **NovaEcosystem**  
Web App client: **NovaPromo**

NovaPromo usa **Firebase** in produzione (Vercel) per dati persistenti e media pubblici per Instagram Graph API.

## Schema Firestore

### `connected_accounts/{platform}`

Document ID = `instagram` | `tiktok` (un account per piattaforma).

| Campo | Tipo | Note |
|-------|------|------|
| `platform` | string | `instagram` / `tiktok` |
| `externalUserId` | string | Instagram Business ID o TikTok openId |
| `username` | string | @handle |
| `displayName` | string | |
| `accessTokenEncrypted` | string | AES-GCM (ENCRYPTION_KEY) |
| `refreshTokenEncrypted` | string? | |
| `tokenExpiresAt` | string? | ISO8601 |
| `scopes` | string[] | es. `instagram_business_basic` |
| `metadata` | map | `instagramAccountId`, `connectionMode`, `accountType`, … |
| `createdAt` | string | ISO8601 |
| `updatedAt` | string | ISO8601 |

### `posts/{postId}`

| Campo | Tipo | Note |
|-------|------|------|
| `project` | string | NovaDocs, Beauty Souls, … |
| `platform` | string | `instagram` / `tiktok` / `both` |
| `contentType` | string | `post`, `story`, `reel`, … |
| `tone` | string | |
| `topic` | string | |
| `caption` | string | |
| `hashtags` | string | |
| `cta` | string | |
| `reelIdea` | string | |
| `overlayTitle` | string | |
| `mediaPath` | string? | path locale legacy (desktop) |
| `mediaMimeType` | string? | `image/jpeg`, `video/mp4`, … |
| `mediaPublicUrl` | string? | **URL HTTPS per Instagram** (`image_url`) |
| `mediaStoragePath` | string? | `novapromo/media/{uuid}.jpg` su Firebase Storage |
| `scheduledAt` | string? | calendario / schedule |
| `status` | string | `draft` / `scheduled` / `published` / `error` |
| `errorMessage` | string? | |
| `instagramMediaId` | string? | |
| `instagramContainerId` | string? | |
| `tiktokPublishId` | string? | |
| `publishedAt` | string? | |
| `viewCount` | number | |
| `createdAt` | string | |
| `updatedAt` | string | |

### `publication_logs/{logId}`

| Campo | Tipo |
|-------|------|
| `postId` | string |
| `platform` | string |
| `action` | string | `publish_start`, `publish_complete`, `publish_error` |
| `status` | string | `info` / `success` / `error` |
| `message` | string? |
| `details` | map? |
| `createdAt` | string |

### `users/{openId}` (TikTok login kit, opzionale)

Profili utente TikTok per Firebase Auth custom token.

---

## Firebase Storage

| Path | Uso |
|------|-----|
| `novapromo/media/{uuid}.{ext}` | Immagini/video caricati dall’utente |

Dopo l’upload il backend salva `mediaPublicUrl` (download URL con token) nel post Firestore.  
Instagram Graph API usa quel URL come `image_url` o `video_url`.

**Non** usare `/tmp`, `/uploads` locali o Vercel Blob per pubblicare su Instagram in produzione.

---

## Variabili ENV (backend Vercel `novapromo-backend`)

### Obbligatorie per Firebase

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
```

### Storage / data store

```env
DATA_STORE=firebase
```

Su Vercel, se `FIREBASE_*` sono impostate, Firestore viene usato automaticamente anche senza `DATA_STORE`.

Per sviluppo locale con SQLite:

```env
DATA_STORE=sqlite
```

### Già richieste (OAuth Instagram invariato)

```env
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
META_REDIRECT_URI=https://novapromo-backend.vercel.app/api/oauth/instagram/callback
ENCRYPTION_KEY=...   # 32+ caratteri, per cifrare token in Firestore
SESSION_SECRET=...
FRONTEND_URL=https://novapromo.vercel.app
BACKEND_URL=https://novapromo-backend.vercel.app
```

---

## Setup Firebase Console (NovaEcosystem)

**Project ID:** `novaecosystem-b8a4b`  
**Web App:** NovaPromo

### Prima esecuzione (obbligatorio in Console)

1. [Firestore](https://console.firebase.google.com/project/novaecosystem-b8a4b/firestore) → **Create database** → production, regione `europe-west1`
2. [Storage](https://console.firebase.google.com/project/novaecosystem-b8a4b/storage) → **Get started** → stessa regione
3. [Authentication](https://console.firebase.google.com/project/novaecosystem-b8a4b/authentication) → **Get started** (serve per custom token TikTok)

### Setup locale (dopo aver scaricato la chiave Admin SDK)

```bash
npm run setup:firebase -- path/to/service-account.json
npm run test:firebase
```

### Deploy regole (obbligatorio una tantum)

Il service account Admin **non** ha permesso `firebaserules.releases.create`. Due opzioni:

**Opzione A — Firebase CLI (consigliata)** con l’account Google **Owner** del progetto NovaEcosystem:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use novaecosystem-b8a4b
npm run deploy:firebase-rules
# oppure: npx -y firebase-tools@latest deploy --only firestore:rules,storage
```

**Opzione B — Console Firebase** (copia da `firestore.rules` e `storage.rules` nel repo):

1. [Firestore Rules](https://console.firebase.google.com/project/novaecosystem-b8a4b/firestore/rules)
2. [Storage Rules](https://console.firebase.google.com/project/novaecosystem-b8a4b/storage/rules)

**Opzione C — IAM** (per deploy automatico futuro): in [IAM](https://console.cloud.google.com/iam-admin/iam?project=novaecosystem-b8a4b) assegna al service account `firebase-adminsdk-fbsvc@...` il ruolo **Firebase Rules Admin** o **Editor**.

### Verifica integrazione

```bash
npm run test:firebase
```

Ultimo run: **5/5 test passati** (Admin, Firestore, Storage HTTPS URL, Auth custom token, dataStore flags).

### Vercel env

Backend `novapromo-backend`: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`, `DATA_STORE=firebase`  
Frontend `novapromo`: `VITE_FIREBASE_*` (vedi `.env.example`)

---

## Flusso publish Instagram

1. Upload immagine → `persistUploadedMedia()` → Firebase Storage
2. Salva `mediaPublicUrl` + `mediaStoragePath` nel post (Firestore)
3. Publish → `ensurePostPublicMediaUrl(post)` → `image_url` su `POST /{ig-user-id}/media`
4. `POST /{ig-user-id}/media_publish` con `creation_id`

---

## Errori

| Messaggio | Causa |
|-----------|--------|
| `Firebase Storage non configurato: …` | Manca `FIREBASE_STORAGE_BUCKET` o credenziali Admin |
| `Immagine non pubblicabile: serve URL HTTPS pubblico…` | `mediaPublicUrl` assente o non raggiungibile da Instagram |

OAuth Instagram **non** dipende da Firebase: resta su `instagram.com/oauth/authorize` + token in `connected_accounts`.
