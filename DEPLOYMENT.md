# Guide de Déploiement Undercover

Ce guide vous explique comment déployer l'application complète (Frontend + Backend).

## Architecture
- **Frontend (Client)** : Hébergé sur **GitHub Pages**.
- **Backend (Serveur)** : Hébergé sur **Render** (ou tout autre service supportant Python, ex: Railway, Heroku).

> [!NOTE]
> GitHub Pages ne peut héberger que des sites statiques. Le serveur Python doit donc être hébergé ailleurs. Render dispose d'une offre gratuite idéale pour débuter.

---

## Étape 1 : Préparation du Backend (Render)

1.  Créez un compte sur [Render.com](https://render.com).
2.  Créez un **"New Web Service"**.
3.  Connectez votre dépôt GitHub.
4.  Configurez le service :
    -   **Name** : `undercover-server` (exemple)
    -   **Root Directory** : `server-py`
    -   **Runtime** : `Python 3`
    -   **Build Command** : `pip install -r requirements.txt`
    -   **Start Command** : `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
    -   **Free Tier** : Sélectionnez l'option gratuite.
5.  Cliquez sur **Create Web Service**.
6.  Une fois déployé, notez l'URL de votre backend (ex: `https://undercover-server.onrender.com`).

---

## Étape 2 : Configuration du Frontend

1.  Dans votre projet local, allez dans le dossier `client`.
2.  Créez un fichier `.env.production` avec l'URL de votre backend :
    ```bash
    VITE_API_URL=https://votre-backend-sur-render.onrender.com
    ```
3.  Commitez et poussez ce changement sur GitHub (Optionnel, mais recommandé pour la persistance).

---

## Étape 3 : Déploiement du Frontend (GitHub Pages)

Le projet est configuré pour se déployer facilement via la ligne de commande.

1.  **Important** : Assurez-vous d'avoir créé le fichier `.env.production` avec la bonne URL (étape 2).
2.  Placez-vous dans le dossier `client` :
    ```bash
    cd client
    ```
3.  Lancez la commande de déploiement :
    ```bash
    npm run deploy
    ```
    *Cette commande va :*
    1. *Construire le projet (Build) en utilisant l'URL de production.*
    2. *Pousser les fichiers statiques sur la branche `gh-pages` de votre dépôt.*

4.  Votre site sera accessible quelques minutes plus tard sur `https://<votre-user>.github.io/undercover/`.

---

## Résumé des Actions
1. **Render** : Déployez le serveur `server-py` et récupérez l'URL.
2. **Local** : Mettez cette URL dans `client/.env.production`.
3. **Terminal** : `cd client && npm run deploy`.
