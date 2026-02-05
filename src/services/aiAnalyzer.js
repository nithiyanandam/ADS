/**
 * AI Analyzer Service (Mock)
 * 
 * Purpose:
 * - Simulator for GenAI reasoning.
 * - Classifies differences as Expected, Uncertain, or Likely Defect.
 * - Provides confidence and explanation.
 */

export const analyzeDifference = (diff) => {
    // 1. Rule: Date Format Changes -> Expected
    if (isDateFormatChange(diff)) {
        return {
            decision: 'Expected',
            confidence: 0.95,
            explanation: "Analysis suggests this is a standard date format change (e.g., MM/DD/YYYY to YYYY-MM-DD), which fits the new compliance rules."
        };
    }

    // 2. Rule: Version Number Bump -> Expected
    if (diff.path.includes('version') || (diff.oldValue && diff.oldValue.includes('v1.0') && diff.newValue.includes('v1.1'))) {
        return {
            decision: 'Expected',
            confidence: 0.98,
            explanation: "Version number increment is expected for a new release."
        };
    }

    // 3. Rule: New Content Added -> Uncertain
    if (diff.changeType === 'ADDED') {
        return {
            decision: 'Uncertain',
            confidence: 0.60,
            explanation: "New content block added. Please review to ensure it aligns with the requirements."
        };
    }

    // 4. Rule: Port Number Change (specific mock case) -> Defect?
    if (diff.oldValue && diff.oldValue.includes('8080') && diff.newValue && diff.newValue.includes('9090')) {
        return {
            decision: 'Likely Defect',
            confidence: 0.85,
            explanation: "Port number change from 8080 to 9090. This deviates from the standard configuration in the SDD."
        };
    }

    // Default: Uncertain
    return {
        decision: 'Likely Defect', // Defaulting to defect to encourage review
        confidence: 0.50,
        explanation: "Content modification detected. No specific rule matched, so manual review is recommended."
    };
};

const isDateFormatChange = (diff) => {
    if (!diff.oldValue || !diff.newValue) return false;
    // Simple regex check for date-like strings being swapped
    const dateRegex = /\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/;
    return dateRegex.test(diff.oldValue) && dateRegex.test(diff.newValue);
};
