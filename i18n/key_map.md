# Translation Key Map

This document describes the i18n key structure for the Undercover app.

## Key Structure

| Namespace | Key | Description |
|-----------|-----|-------------|
| `app` | `title` | App name |
| `app` | `tagline` | App subtitle |
| `common` | `next`, `back`, `confirm`, `cancel` | Navigation buttons |
| `common` | `start`, `rules`, `error`, `loading` | General UI |
| `home` | `newGame`, `joinGame`, `howToPlay` | Home screen actions |
| `lobby` | `waiting`, `playersJoined`, `roomCode`, `enterName`, `you` | Lobby screen |
| `role` | `reveal`, `hide`, `secretWord`, `youAre` | Role reveal phase |
| `roles` | `civilian`, `undercover`, `mrwhite` | Role names |
| `turn` | `instruction`, `currentPlayer` | Turn phase |
| `vote` | `title`, `instruction`, `eliminate` | Voting phase |
| `result` | `civilianWin`, `undercoverWin`, `mrwhiteWin`, `playAgain` | Game end |

## Interpolation

Use `{{variable}}` for dynamic content:
- `lobby.playersJoined`: `{{count}}`
- `lobby.roomCode`: `{{code}}`
- `turn.currentPlayer`: `{{name}}`

## Usage Example

```tsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('app.title')}</h1>;
}
```
