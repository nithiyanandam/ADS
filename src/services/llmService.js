/**
 * llmService.js
 * 
 * Service to interact with various LLM providers (Gemini Native, OpenRouter/OpenAI).
 */



import { redactText } from './privacyService';

/**
 * Calls the selected LLM provider to analyze a document difference.
 * 
 * @param {Object} diff - The difference object.
 * @param {Object} config - { provider: 'gemini'|'openrouter', apiKey, model, baseUrl, enablePrivacy }
 * @returns {Promise<Object>} - { decision, confidence, explanation }
 */
export async function analyzeDiffWithLLM(diff, config, ragRules = []) {
    const { provider, apiKey, model } = config;

    // Apply Privacy Redaction if enabled (defaulting to true if undefined is safer for GDPR mode)
    const isPrivacyOn = config.enablePrivacy !== false;

    // Redact possibly sensitive fields
    const safeOldValue = isPrivacyOn ? redactText(diff.oldValue) : diff.oldValue;
    const safeNewValue = isPrivacyOn ? redactText(diff.newValue) : diff.newValue;

    // API Key optional for Ollama
    const cleanKey = apiKey?.trim();
    if (provider !== 'ollama' && !cleanKey) throw new Error("API Key is missing");

    const systemPrompt = `
    You are a Compliance Advisor AI operating inside a Retrieval-Augmented Generation (RAG) system.

    Your task is to compare two versions of a document (Old vs New) and evaluate all detected differences strictly against the CURRENT Rulebook retrieved from the knowledge base.

    This system is document-type agnostic and applies to ANY rule-governed document, including but not limited to:
    - Invoices and financial statements
    - Mobile, telecom, and utility bills
    - Contracts, agreements, and legal documents
    - Policies, SOPs, and governance documents
    - Configuration files and system specifications
    - Any PDF or document with agreed compliance rules

    -------------------------------------------------
    RETRIEVAL AUTHORITY & SOURCE OF TRUTH (MANDATORY)
    -------------------------------------------------
    1. The retrieved Rulebook is the ONLY source of compliance truth.
    2. You MUST rely exclusively on retrieved Rulebook chunks for all compliance decisions.
    3. If NO Rulebook chunks are retrieved, explicitly state:
       "No Rulebook retrieved; compliance cannot be confirmed"
       and classify ALL detected differences as "Needs Review".
    4. You MAY reference historical versions (v1, v1.1, v1.2, etc.) ONLY if such information appears in retrieved chunks.
    5. ALL compliance judgments MUST be evaluated against the CURRENT Rulebook version identified during retrieval.

    -------------------------------------------------
    RETRIEVAL INSTRUCTIONS (RAG-AWARE)
    -------------------------------------------------
    Before evaluating compliance:
    - Retrieve Rulebook chunks covering:
      • Mandatory sections / fields / clauses / parameters
      • Optional sections / fields / clauses / parameters
      • Prohibited sections / fields / clauses / parameters
      • Allowed and disallowed values
      • Version-specific changes, deprecations, and exceptions
    - Identify the CURRENT Rulebook version from retrieved content.
    - Ignore any information not present in retrieved chunks.

    -------------------------------------------------
    COMPLIANCE DECISION LOGIC (STRICT)
    -------------------------------------------------
    For EACH detected document difference:
    - Explicitly allowed or expected by the retrieved Rulebook → Expected Difference
    - Explicitly required but missing → Likely a Defect
    - Explicitly prohibited but present → Likely a Defect
    - Not mentioned in the retrieved Rulebook → Needs Review

    Do NOT assume requirements.
    Do NOT infer intent.
    Do NOT hallucinate rules.

    -------------------------------------------------
    CONTEXT
    -------------------------------------------------
    Field: "${diff.path}"
    Old Value: "${safeOldValue}"
    New Value: "${safeNewValue}"

    KNOWLEDGE BASE (Retrieved Rule Fragments):
    ${ragRules && ragRules.length > 0 ? ragRules.map(r => `- ${r.text}`).join('\n') : "NO RULES RETRIEVED."}

    -------------------------------------------------
    RISK SCORING RULES (DETERMINISTIC)
    -------------------------------------------------
    Compliance Risk:
    - Only Expected Differences → Low
    - Only Needs Review items → Low–Medium
    - Any missing mandatory or prohibited element → Medium
    - Multiple or regulatory-critical violations → High

    Contractual / Financial / Governance Risk:
    - No impact to obligations, pricing, terms, or enforcement → Low
    - Changes affect obligations, billing, penalties, or approvals → Medium
    - Direct contractual, financial, or regulatory breach → High

    Operational / System / Customer Impact Risk:
    - Metadata or documentation-only changes → Low
    - Workflow, approval, or processing changes → Medium
    - System failure, billing errors, service disruption, or security risk → High

    -------------------------------------------------
    CONFIDENCE SCORING (MANDATORY)
    -------------------------------------------------
    You MUST compute a Decision Confidence score between 0.00 and 1.00.

    Confidence calculation rules:
    - Start from 1.00
    - Subtract 0.10 for each "Needs Review" item
    - Subtract 0.25 for each "Likely a Defect"
    - Minimum confidence floor is 0.20
    - Do NOT increase confidence above 1.00

    You MUST explain the confidence score mathematically.

    -------------------------------------------------
    OUTPUT FORMAT (STRICT — DO NOT DEVIATE)
    -------------------------------------------------
    Classification: <Expected Difference | Needs Review | Likely a Defect>
    Overall Risk: <Low | Low–Medium | Medium | High>

    Rules Applied:
    - <Rulebook section / rule ID>
    - <Rulebook section / rule ID>

    AI Compliance Reasoning:
    <Explainable reasoning referencing retrieved Rulebook content and detected differences>

    Field / Section / Clause-Level Categorization:

    Expected Differences:
    - <Field / Section / Clause>: <Rule-based explanation>

    Needs Review:
    - <Field / Section / Clause>: <Reason not defined in Rulebook>

    Likely a Defect:
    - <Field / Section / Clause>: <Rule violation explanation>
    - OR "None"

    Why No Defects Were Raised:
    <Include only if Likely a Defect = None>

    Risk Assessment:
    - Compliance Risk: <Low | Low–Medium | Medium | High>
    - Contractual / Financial / Governance Risk: <Low | Medium | High>
    - Operational / System / Customer Impact Risk: <Low | Medium | High>

    Decision Confidence:
    - Overall Confidence: <0.00–1.00>
    - Calculation Explanation: <Explain deductions clearly>

    -------------------------------------------------
    QUALITY & SAFETY GUARANTEES
    -------------------------------------------------
    - Undefined elements MUST be categorized as "Needs Review".
    - If no violations exist, "Likely a Defect" MUST be "None".
    - Risk levels MUST align strictly with defined rules.
    - Output must be audit-ready, reproducible, and universally applicable.

    OUTPUT JSON ONLY:
    {
       "aiReasoning": "...",
       "ruleHighlights": "...",
       "riskAssessment": {
           "compliance": "...",
           "contractual": "...",
           "operational": "...",
           "overall": "..."
       },
       "decision": "Expected Difference" | "Needs Review" | "Likely a Defect",
       "explanation": "...",
       "confidence": {
           "score": 0.00,
           "explanation": "..."
       }
    }
    `;

    // ... inside try/catch ...
    let result;
    if (provider === 'gemini') {
        result = await callGeminiNative(systemPrompt, cleanKey, model || "gemini-1.5-flash", config.baseUrl);
    } else if (provider === 'openrouter') {
        result = await callOpenRouter(systemPrompt, cleanKey, model || "google/gemini-flash-1.5", config.baseUrl);
    } else if (provider === 'ollama') {
        const baseUrl = config.baseUrl || "http://localhost:11434"; // Default
        result = await callOllamaNative(systemPrompt, model || "phi3", baseUrl);
    } else {
        throw new Error(`Unknown provider: ${provider}`);
    }

    // [DEBUG] Inject rule count for UI
    if (result) {
        result._debugRuleCount = ragRules ? ragRules.length : 0;
        console.log(`[LLM Service] Analysis complete. Rules used: ${result._debugRuleCount}`);
    }
    return result;
}

// ... existing Gemini/OpenRouter logic ...

// Ollama Native API
async function callOllamaNative(prompt, model, baseUrl) {
    const cacheKey = `ollama:${model}:${prompt}`;
    if (requestCache.has(cacheKey)) {
        console.log("Returning cached LLM response for Ollama");
        return requestCache.get(cacheKey);
    }

    // Using /api/generate for single prompt or /api/chat. 
    // /api/chat is usually better for strict system/user role separation if model supports it.
    // Let's use /api/generate with raw=false (default) for simplicity, or /api/chat.
    // Phi-3 and others work well with chat.
    const url = `${baseUrl}/api/chat`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: "You are a QA assistant. Respond in JSON only." },
                    { role: "user", content: prompt }
                ],
                stream: false,
                format: "json", // Enforce JSON mode if model supports it
                options: {
                    temperature: 0.0,
                    seed: 42
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Ollama API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const text = data.message?.content;

        if (!text) throw new Error("No response from Ollama");
        const result = JSON.parse(cleanJsonResponse(text));
        requestCache.set(cacheKey, result);
        return result;

    } catch (error) {
        // Helpful error for CORS
        if (error.message.includes("Failed to fetch")) {
            throw new Error("Connection failed. Ensure Ollama is running and OLLAMA_ORIGINS=\"*\" is set.");
        }
        throw error;
    }
}

// ... verifyApiConnection update ...
export async function verifyApiConnection(config) {
    const { provider, apiKey, baseUrl } = config;
    const cleanKey = apiKey?.trim();

    // API Key required for others, but not Ollama
    if (provider !== 'ollama' && !cleanKey) throw new Error("API Key is missing");

    try {
        if (provider === 'gemini') {
            // Test Gemini by listing models (lightweight)
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}&pageSize=1`;
            const response = await fetch(url);
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Gemini Error: ${response.status} - ${text}`);
            }
            return true;
        } else if (provider === 'openrouter') {
            // Test OpenRouter auth endpoint
            const url = "https://openrouter.ai/api/v1/auth/key";
            const response = await fetch(url, {
                headers: { "Authorization": `Bearer ${cleanKey}` }
            });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`OpenRouter Error: ${response.status} - ${text}`);
            }
            return true;
        } else if (provider === 'ollama') {
            const finalUrl = `${baseUrl || "http://localhost:11434"}/api/tags`;
            try {
                const response = await fetch(finalUrl);
                if (!response.ok) throw new Error("Ollama returned error");
                return true;
            } catch (e) {
                throw new Error("Could not connect to Ollama. Ensure it's running and OLLAMA_ORIGINS=\"*\" is set.");
            }
        } else {
            throw new Error(`Verification not supported for provider: ${provider}`);
        }
    } catch (error) {
        throw error;
    }
}

const requestCache = new Map();

// Google Gemini Native API
async function callGeminiNative(prompt, apiKey, model, baseUrl) {
    const cacheKey = `gemini:${model}:${prompt}`;
    if (requestCache.has(cacheKey)) {
        console.log("Returning cached LLM response for Gemini");
        return requestCache.get(cacheKey);
    }

    // Use config baseUrl or fall back to standard
    const apiBase = baseUrl || "https://generativelanguage.googleapis.com/v1beta/models";
    const url = `${apiBase}/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.0 // Force deterministic output
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from Gemini");

    const result = JSON.parse(cleanJsonResponse(text));

    // [DEBUG] Inject rule count for UI verification
    result._debugRuleCount = ragRules ? ragRules.length : 0;

    requestCache.set(cacheKey, result); // Cache success
    return result;
}

// OpenAI Compatible API (OpenRouter)
async function callOpenRouter(prompt, apiKey, model, baseUrl = "https://openrouter.ai/api/v1") {
    const cacheKey = `openrouter:${model}:${prompt}`;
    if (requestCache.has(cacheKey)) {
        console.log("Returning cached LLM response for OpenRouter");
        return requestCache.get(cacheKey);
    }

    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "DocDiff POC"
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.0, // Force deterministic output
            seed: 42 // Optional: Try to enforce seed if supported
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("No response from OpenRouter");

    const result = JSON.parse(cleanJsonResponse(text));
    requestCache.set(cacheKey, result); // Cache success
    return result;
}

/**
 * Removes markdown code fences from JSON strings.
 * e.g., ```json { ... } ``` -> { ... }
 */
function cleanJsonResponse(text) {
    if (!text) return "";
    return text.replace(/```json\s*|\s*```/g, "").trim();
}



/**
 * Fetches the list of available models from OpenRouter.
 * @returns {Promise<Array>} List of model objects { id, name }.
 */
export async function fetchOpenRouterModels() {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/models");
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
        }
        const data = await response.json();
        return data.data; // OpenRouter returns { data: [ { id, name, ... }, ... ] }
    } catch (error) {
        console.error("Error fetching models:", error);
        return [];
    }
}
