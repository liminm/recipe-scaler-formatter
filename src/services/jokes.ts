
const HISTORY_SIZE = 50;
const history: string[] = [];

/**
 * Selects a random joke from the pool, ensuring it hasn't been shown recently.
 * Maintains a global history of the last 50 jokes shown.
 */
export function getNextJoke(pool: string[]): string {
    if (!pool || pool.length === 0) return '';

    // If pool is small, relax the history constraint to avoid infinite loops
    const effectiveHistorySize = Math.min(HISTORY_SIZE, Math.floor(pool.length / 2));

    let candidate: string;
    let attempts = 0;
    const maxAttempts = 20;

    do {
        candidate = pool[Math.floor(Math.random() * pool.length)];
        attempts++;
    } while (history.includes(candidate) && attempts < maxAttempts);

    // Update history
    history.push(candidate);
    if (history.length > effectiveHistorySize) {
        history.shift();
    }

    return candidate;
}
