
const API_BASE = 'http://localhost:8000/advisory';

/**
 * Upload a Rulebook PDF
 */
export async function uploadRulebook(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Upload failed');
    }
    return await response.json();
}

/**
 * List active rulebooks
 */
export async function listRulebooks() {
    try {
        const response = await fetch(`${API_BASE}/rules`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.rulebooks || [];
    } catch (e) {
        console.warn("Advisory service offline?", e);
        return [];
    }
}

/**
 * Retrieve relevant rules for a specific difference
 */
export async function retrieveRelevantRules(diffText) {
    try {
        const response = await fetch(`${API_BASE}/retrieve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diff_text: diffText })
        });

        if (!response.ok) {
            console.error("RAG Fetch Failed:", response.status, response.statusText);
            return [];
        }
        const data = await response.json();
        console.log(`[RAG] Query: "${diffText}" -> Found ${data.rules?.length || 0} rules.`);
        return data.rules || [];
    } catch (e) {
        console.error("Failed to retrieve rules:", e);
        return [];
    }
}

/**
 * Clear all rulebooks
 */
export async function clearRulebooks() {
    try {
        const response = await fetch(`${API_BASE}/clear`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Failed to clear rulebooks');
        }
        return await response.json();
    } catch (e) {
        console.error("Clear rulebooks failed:", e);
        throw e;
    }
}
