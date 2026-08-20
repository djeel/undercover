# Guide de déploiement Undercover

## Architecture

- **Client statique (React/Vite)** : hébergé sur **Vercel** en production ; **GitHub Pages** reste possible via `client/deploy.sh` (conservé).
- **API (FastAPI)** : hébergée sur **Render** (Web Service, dossier racine `server-py`).
- **Identité, Postgres, Realtime** : **Supabase** (auth OAuth Google/Discord, base de données, Realtime privé).

> [!NOTE]
> Les variables VITE\_* sont figées au moment du build côté client. Aucune valeur de production ni aucun secret n'est versionné : le dépôt ne contient que des **noms de variables** (`client/.env.production`, `render.yaml`, guides ci-dessous).

---

## 1. Supabase (prérequis transversal)

1. Appliquez les migrations du dossier `supabase/migrations` sur un projet Supabase.
2. Configurez les redirections OAuth dans le tableau de bord Supabase → **Authentication → URL Configuration** :
   - Web (GitHub Pages) : `https://djeel.github.io/undercover/auth/callback` — origine `https://djeel.github.io`, route exacte `/undercover/auth/callback`.
   - Web (Vercel) : `<origine-du-déploiement-vercel>/auth/callback` (la base de Vercel est `/`, voir `client/vite.config.ts`).
   - Android : `com.djeel.undercover://auth/callback` — schéma custom du client Capacitor (`appId` `com.djeel.undercover`, `capacitor.config.ts`).
3. Ajoutez ces mêmes URL dans la configuration des fournisseurs **Google** et **Discord** (Authorized redirect URIs).

---

## 2. Variables d'environnement (noms uniquement)

### Client (Vercel → Project → Environment Variables, ou `client/.env.production` pour GitHub Pages)

| Variable | Rôle |
| --- | --- |
| `VITE_API_URL` | URL de base de l'API Render (ex. `https://<service>.onrender.com/api` — remplacer `<service>` par le nom du service) |
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé **publique** Supabase (anonyme/publishable) |

### Serveur (Render → Environnement)

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | DSN Postgres Supabase (pooler transaction) |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SECRET_KEY` | Clé **secrète** Supabase — jamais exposée au client |
| `SUPABASE_JWT_AUDIENCE` | Audience JWT, défaut `authenticated` |
| `CORS_ORIGINS` | Liste JSON des origines autorisées (GitHub Pages, Vercel, localhost de dev) |

---

## 3. Déploiement de l'API (Render)

**Option A — Blueprint.** Le fichier `render.yaml` à la racine du dépôt est détecté par Render : il crée le Web Service (`server-py`, commandes build/start) et déclare les variables de la section 2. Celles marquées `sync: false` sont à renseigner dans le tableau de bord Render (aucune valeur n'est versionnée).

**Option B — Manuel.** Dashboard Render → **New Web Service** :
- **Name** : `undercover-server` (exemple)
- **Root Directory** : `server-py`
- **Runtime** : Python 3
- **Build Command** : `pip install -r requirements.txt`
- **Start Command** : `uvicorn src.main:app --host 0.0.0.0 --port $PORT`

Renseignez ensuite les cinq variables serveur de la section 2. L'API refuse de démarrer en production sans `DATABASE_URL`.

---

## 4. Déploiement du client (Vercel)

1. Importez le dépôt sur Vercel. La configuration racine (`vercel.json`) construit le workspace `client` et publie `client/dist` ; la base est `/`.
2. Définissez les trois variables client de la section 2 dans le tableau de bord Vercel.
3. Poussez sur `main` : Vercel déploie automatiquement.

---

## 5. Déploiement GitHub Pages (alternatif)

`client/deploy.sh` est conservé. Les variables VITE\_* étant figées au build, remplissez d'abord `client/.env.production` (le dépôt ne contient que le modèle de noms, aucune valeur) avec les vraies valeurs, puis :

```bash
cd client
./deploy.sh
```

Le site est servi sur `https://djeel.github.io/undercover/` ; le callback OAuth correspondant est celui du point 1. En l'absence de valeurs, l'application affiche une erreur de configuration localisée (pas de repli silencieux vers localhost).

---

## Résumé des actions

1. **Supabase** : appliquer les migrations + configurer les redirections OAuth (web GitHub Pages/Vercel, schéma Android).
2. **Render** : déployer `server-py` (blueprint ou manuel) et renseigner les variables serveur.
3. **Vercel** : importer le dépôt et renseigner les variables client.
4. **(Option)** **GitHub Pages** : renseigner `client/.env.production` puis `cd client && ./deploy.sh`.