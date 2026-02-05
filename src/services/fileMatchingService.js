
import { analyzeDiffWithLLM } from './llmService';

/**
 * Matches files between two lists using AI.
 * 
 * @param {Array<File>} oldFiles - List of old files
 * @param {Array<File>} newFiles - List of new files
 * @param {Object} aiConfig - AI Configuration
 * @returns {Promise<Array>} - List of pairs { id, oldFile, newFile }
 */
export async function matchFilenamesWithAI(oldFiles, newFiles, aiConfig) {
    if (!aiConfig.apiKey) {
        throw new Error("AI API Key is required for Smart Matching.");
    }

    const oldNames = oldFiles.map(f => f.name);
    const newNames = newFiles.map(f => f.name);

    const prompt = `
    You are an intelligent file matching assistant.
    Your task is to match files from an "Old Version" list to a "New Version" list.
    
    Rules:
    1. Match files that are likely the same document, even if the version number, date, or suffix has changed.
    2. Examples: 
       - "Policy_v1.pdf" matches "Policy_v2.pdf"
       - "Terms_2023.pdf" matches "Terms_2024.pdf"
       - "invoice_jan.pdf" matches "invoice_feb.pdf"
    3. If there is no clear match, do not force it.
    
    Old Files:
    ${JSON.stringify(oldNames)}
    
    New Files:
    ${JSON.stringify(newNames)}
    
    Return a JSON object with a "matches" array.
    Each match should be: { "old": "filename", "new": "filename" }
    Only return best guess matches.
    `;

    // Re-use the existing LLM service's provider logic by mocking a "diff" object
    // or we can expose a raw 'generateText' method in llmService. 
    // For now, let's reuse callGemini/callOpenRouter indirectly or refactor llmService.
    // Actually, llmService's analyzeDiffWithLLM is too specific to diffs. 
    // Let's assume we can import the lower-level call functions if we exported them, 
    // OR we just create a new generic method in llmService.

    // BETTER APPROACH: Let's use a generic method in llmService if available.
    // Since it's not, we'll implement a temporary fetch here or refactor llmService.
    // To solve this cleanly without touching llmService too much, let's just use the 'customRules' injection hack 
    // or proper generic call?
    // Let's refactor llmService slightly to export a generic 'askAI' method.

    // Wait, I can't easily refactor llmService efficiently in one step if I don't see it. 
    // I previously viewed it. It has 'verifyApiConnection'. 

    // I will use a direct fetch here to keep it simple and decoupled, reusing the config.

    try {
        if (aiConfig.provider === 'gemini') {
            return await matchWithGemini(prompt, aiConfig.apiKey, aiConfig.model);
        } else if (aiConfig.provider === 'openrouter') {
            return await matchWithOpenRouter(prompt, aiConfig.apiKey, aiConfig.model, aiConfig.baseUrl);
        }
        throw new Error("Only Gemini and OpenRouter supported for Matching.");
    } catch (e) {
        console.error("AI Matching Failed:", e);
        throw e;
    }
}

async function matchWithGemini(prompt, apiKey, model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });

    if (!response.ok) throw new Error("Gemini API Error in Matching");

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return mapResults(json.matches);
}

async function matchWithOpenRouter(prompt, apiKey, model, baseUrl) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) throw new Error("OpenRouter API Error in Matching");

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return mapResults(json.matches);
}

function mapResults(matches) {
    // Convert string pairs back to our app's format
    // But we need the File objects. 
    // The caller (DirectoryUpload) will need to map these names back to objects.
    // So we just return the name pairs.
    return matches;
}
