export type LocalComposition = {
    undercoverCount: number;
    mrWhiteCount: number;
    jesterCount: number;
    bodyguardCount: number;
};

export type LocalCompositionValidation =
    | { valid: true }
    | {
        valid: false;
        reason: 'playerCount' | 'counts' | 'undercover' | 'bodyguard' | 'civilianTeam';
    };

export const validateLocalComposition = (
    playerCount: number,
    { undercoverCount, mrWhiteCount, jesterCount, bodyguardCount }: LocalComposition,
): LocalCompositionValidation => {
    const counts = [undercoverCount, mrWhiteCount, jesterCount, bodyguardCount];

    if (!Number.isInteger(playerCount) || playerCount < 3 || playerCount > 12) return { valid: false, reason: 'playerCount' };
    if (counts.some((count) => !Number.isInteger(count) || count < 0)) return { valid: false, reason: 'counts' };
    if (undercoverCount < 1) return { valid: false, reason: 'undercover' };
    if (bodyguardCount > 1) return { valid: false, reason: 'bodyguard' };
    if (counts.reduce((total, count) => total + count, 0) > playerCount - 2) return { valid: false, reason: 'civilianTeam' };

    return { valid: true };
};
