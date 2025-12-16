export const generatePlayerId = () => Math.random().toString(36).substr(2, 9);
export const generatePlayerName = () => `Player_${Math.floor(Math.random() * 1000)}`;
