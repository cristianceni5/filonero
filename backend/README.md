# FiloNero Backend MVP

Backend serverless MVP di FiloNero, sviluppato in TypeScript su Netlify Functions e PostgreSQL.

## Stack

- TypeScript
- Netlify Functions
- PostgreSQL (`pg`)
- Zod (validazione input)
- Argon2 (hash password)
- JWT access token + refresh token random hashato
- Magic link monouso hashato in DB
- Resend dietro un servizio mail astratto

## Requisiti

- Node.js 20+
- PostgreSQL 14+

## Setup locale

1. Installa dipendenze:
   - `npm install`
2. Crea file env:
   - copia `.env.example` in `.env`
3. Inizializza lo schema DB:
   - `npm run db:init`
4. Avvia in locale:
   - `npm run dev`
5. Apri pagina debug:
   - `http://localhost:8888/debug`

API disponibili su `/api/*` con rewrite verso `/.netlify/functions/api/*`.

## Debug page (HTML minimale)

Path:
- `/debug`

La pagina debug permette di testare:
- register/login
- magic link request/verify
- refresh token
- me/logout
- lista conversazioni
- creazione conversazione direct
- lista messaggi
- invio messaggio
- ricerca utenti

## Deploy Netlify

1. Collega repository su Netlify
2. Imposta **Base directory** a `backend`
3. Mantieni `netlify.toml` come fonte di verita
4. Configura env vars da `.env.example` in:
   - `Site settings -> Environment variables`
5. Deploy production

## Endpoint

Gli esempi JSON sono in:
- `docs/api-examples.md`

## TODO post-MVP

- Push notifications
- End-to-end encryption (E2EE)
- Allegati (immagini/file)
- Sessioni multi-device avanzate
- Presenza online/realtime robusto
