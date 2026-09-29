# HELPY — Marketplace mondial (Buy • Sell • Services • Businesses)

Node.js + Express + PostgreSQL, frontend HTML/CSS/JS (SPA mobile-first, FR/EN/Kreyòl).

## Installation locale
```bash
npm install
createdb helpy
cp .env.example .env      # puis éditer DATABASE_URL et JWT_SECRET
export $(grep -v '^#' .env | xargs)
npm start                 # http://localhost:3000
```
Les tables sont créées automatiquement au démarrage.

## Variables d'environnement
| Variable | Rôle |
|---|---|
| DATABASE_URL | Connexion PostgreSQL (obligatoire) |
| JWT_SECRET | Secret de signature des sessions (obligatoire) |
| PORT | Port HTTP (défaut 3000) |
| PGSSL | `true` si votre base exige SSL |

## Déploiement Railway
1. Poussez le dossier sur GitHub. 2. Railway → New Project → Deploy from GitHub.
3. Ajoutez le plugin PostgreSQL (`DATABASE_URL` est injectée automatiquement).
4. Ajoutez `JWT_SECRET` (longue chaîne aléatoire) et `PGSSL=true` si nécessaire. Start command : `npm start`.
5. Testez `/api/health`.

## Structure
`server.js` (API, schéma, modération) · `public/` (index.html, css/style.css, js/api.js, js/app.js).

## API
POST /api/register, /api/login · GET/PUT /api/users/:id · CRUD /api/products|services|businesses (filtres : q, category, country, city, min, max, sort, page)
· GET/POST/DELETE /api/favorites · GET/POST /api/messages · GET/POST /api/reviews · GET /api/notifications · POST /api/reports · GET /api/health
