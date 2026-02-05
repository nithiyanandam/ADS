/**
 * Memory Store Service (Learning Layer)
 * 
 * Purpose:
 * - Stores patterns of differences that have been "Accepted" by the user.
 * - Allows the AI Analyzer (or App) to check if a difference is "Learned Expected".
 */

const MEMORY_STORAGE_KEY = 'docdiff_learned_patterns_v1';

// Initialize from LocalStorage
const loadPatterns = () => {
    try {
        const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
        console.error("Failed to load memory:", e);
        return new Set();
    }
};

const learnedPatterns = loadPatterns();

export const learnDifference = (diff) => {
    const signature = createSignature(diff);
    if (!learnedPatterns.has(signature)) {
        learnedPatterns.add(signature);
        savePatterns();
        console.log(`[Memory] Learned pattern: ${signature}`);
    }
};

export const checkMemory = (diff) => {
    const signature = createSignature(diff);
    if (learnedPatterns.has(signature)) {
        return {
            decision: 'Expected',
            confidence: 0.99,
            explanation: "This difference matches a pattern you previously accepted (Learned Memory)."
        };
    }
    return null;
};

export const clearMemory = () => {
    learnedPatterns.clear();
    localStorage.removeItem(MEMORY_STORAGE_KEY);
    console.log("[Memory] Cleared all learned patterns.");
};

const savePatterns = () => {
    try {
        localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(Array.from(learnedPatterns)));
    } catch (e) {
        console.error("Failed to save memory:", e);
    }
};


const createSignature = (diff) => {
    // We include a hash/snippet of the content so that "Different changes to the same field" are treated differently.
    // If it's a structural change (ADDED/REMOVED), we might care about the value too.
    const valSnippet = (diff.oldValue || diff.newValue || "").toString().slice(0, 20);
    return `${diff.path}|${diff.changeType}|${valSnippet}`;
};
