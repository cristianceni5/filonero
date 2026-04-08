# FiloNero Backend MVP

Backend serverless MVP di FiloNero, sviluppato in TypeScript su Netlify Functions e PostgreSQL.

## Stack

- TypeScript
- Netlify Functions
- PostgreSQL (`pg`)
- Zod (validazione input)
- Argon2 (hash password)
- JWT + refresh token random hashato
- Resend (incapsulato da servizio mail astratto)

## Requisiti

- Node.js 20+
- PostgreSQL 14+
- Netlify CLI (`npm i -g netlify-cli`)

## Setup rapido

1. Installa dipendenze:
   - `npm install`
2. Crea env locale:
   - copia `.env.example` in `.env`
3. Inizializza schema DB:
   - esegui `sql/001_init.sql` sul database PostgreSQL
4. Avvio locale:
   - `npm run dev`

Le API saranno disponibili tramite path `/api/*` (rewrite verso `/.netlify/functions/api/*`).

## Deploy su Netlify

1. Configura variabili ambiente in Netlify (`Site settings -> Environment variables`)
2. Collega il progetto e assicurati che root del sito punti a `backend/`
3. Deploy:
   - `netlify deploy --prod`

## Endpoint

Tutti gli endpoint MVP sono documentati in:
- `docs/api-examples.md`

## TODO evolutivi (post-MVP)

- Push notifications
- End-to-end encryption (E2EE)
- Allegati (immagini/file)
- Sessioni multi-device avanzate
- Presenza online/realtime robusto (WebSocket o similar)
