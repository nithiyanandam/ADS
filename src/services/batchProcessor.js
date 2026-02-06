
import { parsePdf } from './pdfParser';
import { normalizeDocument } from './normalizer';
import { compareDocuments } from './comparisonEngine';
import { analyzeDifference } from './aiAnalyzer';
import { analyzeDiffWithLLM } from './llmService';
import { checkMemory } from './memoryStore';
import { retrieveRelevantRules } from './advisoryService';

console.error("!!! BATCH PROCESSOR RELOADED - V4 !!!");

/**
 * Process a batch of matched file pairs.
 * 
 * @param {Array} pairs - List of { id, oldFile, newFile }
 * @param {Object} aiConfig - AI Configuration
 * @param {Function} onProgress - Callback (completedCount, totalCount, currentFileId)
 * @returns {Promise<Array>} - List of file results { fileId, status ('Passed'|'Failed'|'Review Needed'|'Error'), defects, uncertain, diffs }
 */
export async function processBatch(pairs, aiConfig, onProgress) {
    const results = [];
    let completed = 0;

    // Process sequentially to respect rate limits and browser performance
    for (const pair of pairs) {
        onProgress(completed, pairs.length, pair.id);

        try {
            // 1. Comparison Pipeline
            const fileResult = await processSinglePair(pair, aiConfig);
            results.push(fileResult);
        } catch (error) {
            console.error(`Error processing ${pair.id}:`, error);
            results.push({
                fileId: pair.id,
                status: 'Error',
                error: error.message,
                defects: 0,
                score: 0
            });
        }

        completed++;
    }

    onProgress(completed, pairs.length, null); // Done
    return results;
}

async function processSinglePair(pair, aiConfig) {
    // 1. Parse
    const oldJson = await parsePdf(pair.oldFile, aiConfig);
    const newJson = await parsePdf(pair.newFile, aiConfig);

    // 2. Normalize
    const oldNorm = normalizeDocument(oldJson);
    const newNorm = normalizeDocument(newJson);

    // 3. Compare
    const rawDiffs = compareDocuments(oldNorm, newNorm);

    // 4. AI Analysis (Sequential to prevent RAG/LLM overload)
    const analyzedDiffs = [];
    for (const diff of rawDiffs) {
        // Check Memory First
        // [DEBUG] Disable memory to force fresh RAG execution
        // const memoryResult = checkMemory(diff);
        // if (memoryResult) {
        //     analyzedDiffs.push({ ...diff, aiAnalysis: memoryResult });
        //     continue;
        // }

        // Use AI
        let analysis;
        if (aiConfig.apiKey) {
            // [RAG Injection] Retrieve relevant rules dynamically
            // Use field label AND content for better semantic matching
            const queryText = `${diff.fieldLabel || ''} ${diff.oldValue || ''} ${diff.newValue || ''} ${diff.changeType}`.trim().substring(0, 200);

            console.log(`[Batch] RAG Query: ${queryText}`);
            const ragRules = await retrieveRelevantRules(queryText);
            console.log(`[Batch] RAG Rules Retrieved: ${ragRules ? ragRules.length : 0}`);

            // Pass rules to LLM for "Unified Reasoning"
            analysis = await analyzeDiffWithLLM(diff, aiConfig, ragRules);
        } else {
            analysis = analyzeDifference(diff);
        }
        analyzedDiffs.push({ ...diff, aiAnalysis: analysis });
    }

    // 5. Aggregate Stats
    const defects = analyzedDiffs.filter(d => d.aiAnalysis.decision === 'Likely Defect').length;
    const uncertain = analyzedDiffs.filter(d => d.aiAnalysis.decision === 'Uncertain').length;

    // Status Logic: Pass if 0 Defects. (Uncertainties might flag 'Review Needed')
    let status = 'Passed';
    if (defects > 0) status = 'Failed';
    else if (uncertain > 0) status = 'Review Needed';

    return {
        fileId: pair.id,
        status,
        defects,
        uncertain,
        diffs: analyzedDiffs
    };
}
