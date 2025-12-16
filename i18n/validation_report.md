# UX Text Validation Report

## Summary
**Status**: ⚠️ Hardcoded strings found

## Files Reviewed
- `client/src/App.tsx`

## Hardcoded Strings Found

### `App.tsx`

| Line | Hardcoded String | Suggested Key |
|------|------------------|---------------|
| 46 | `"Undercover Game"` | `app.title` |
| 47 | `"Connected"` / `"Disconnected"` | `common.connected` / `common.disconnected` |
| 51 | `"Lobby"` | `home.lobby` or new `lobby.title` |
| 53 | `"Room ID"` | `lobby.roomIdPlaceholder` |
| 58 | `"Your Name"` | `lobby.enterName` |
| 62 | `"Join / Create"` | `lobby.joinOrCreate` |
| 66 | `"Room: "` | `lobby.roomLabel` |
| 67 | `"Players:"` | `lobby.playersLabel` |
| 71 | `"(You)"` | `lobby.you` |

## Required Actions

1. **Install react-i18next** in client:
   ```bash
   npm install react-i18next i18next
   ```

2. **Configure i18n** (create `client/src/i18n.ts`):
   ```ts
   import i18n from 'i18next';
   import { initReactI18next } from 'react-i18next';
   import en from '../../i18n/en.json';
   import fr from '../../i18n/fr.json';

   i18n.use(initReactI18next).init({
     resources: { en: { translation: en }, fr: { translation: fr } },
     lng: 'fr',
     fallbackLng: 'en',
     interpolation: { escapeValue: false }
   });

   export default i18n;
   ```

3. **Import i18n** in `main.tsx`

4. **Replace hardcoded strings** in `App.tsx` with `t()` calls

## Missing Keys to Add

Add these keys to both `en.json` and `fr.json`:

| Key | EN | FR |
|-----|----|----|
| `common.connected` | Connected | Connecté |
| `common.disconnected` | Disconnected | Déconnecté |
| `lobby.title` | Lobby | Salon |
| `lobby.roomIdPlaceholder` | Room ID | Code de la salle |
| `lobby.joinOrCreate` | Join / Create | Rejoindre / Créer |
| `lobby.roomLabel` | Room: {{id}} | Salle : {{id}} |
| `lobby.playersLabel` | Players: | Joueurs : |
