# playSURE Monitoring (CS2 Players)

Deux pages :

- **/** : page de connexion (pseudo + password)
- **/player** : dashboard (tableau 10 derniers jours + colonne du jour)

Le design est basé sur le template playSURE d'origine, avec :

- top nav conservée (logo à gauche : **playSURE Monitoring**)
- BG d'accueil : `public/assets/BG_Title.png`

## Démarrer en local

```bash
npm i
npm run dev
```

En local, si tu ne lances pas via Netlify, l'app bascule automatiquement en **fallback localStorage**.

## Netlify (prod)

Le projet est prêt pour Netlify (SPA) :

- `public/_redirects` : redirection vers `index.html`
- `netlify.toml` : répertoire des functions

### Initialiser un joueur (admin)

1. Ajoute le pseudo dans `public/players.json`.
2. Dans Netlify → Site settings → Environment variables :
   - `ADMIN_SECRET` : un secret (ex: 32 chars)
3. Appelle la function admin :

`POST /.netlify/functions/admin_init_player`

Headers :

- `x-admin-secret: <ADMIN_SECRET>`

Body :

```json
{ "pseudo": "Romain", "password": "A1B2C3" }
```

### Connexion

`POST /.netlify/functions/login` → renvoie un token (stocké en localStorage).

### Données

- `GET /.netlify/functions/get_player`
- `POST /.netlify/functions/save_entry`

Les données sont stockées dans Netlify Blobs, et une purge automatique conserve **60 jours**.

Portfolio React + Tailwind (style CS2 / Steam).

## Dev

```bash
npm install
npm run dev
