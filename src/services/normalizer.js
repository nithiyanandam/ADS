/**
 * JSON Normalizer Service
 * 
 * Purpose:
 * - Cleans and standardizes extracted JSON before comparison.
 * - Key features:
 *   - Date normalization (to YYYY-MM-DD)
 *   - Whitespace trimming
 *   - Marking dynamic fields (placeholder logic)
 */

export const normalizeDocument = (docJson) => {
    // Deep copy to avoid mutating original mock data
    const normalized = JSON.parse(JSON.stringify(docJson));

    normalized.pages.forEach(page => {
        page.blocks.forEach(block => {
            // 1. Whitespace Normalization
            if (block.value && typeof block.value === 'string') {
                block.value = block.value.trim().replace(/\s+/g, ' ');
            }

            // 2. Date Normalization (Simple heuristic for POC)
            // If block looks like a date or has a date label
            if (isDateBlock(block)) {
                block.value = normalizeDate(block.value);
            }

            // 3. Dynamic Field Marking (Placeholder)
            // In a real app, strict rules would apply here.
            if (block.type === 'field' && block.label === 'Transaction ID') {
                block.isDynamic = true;
            }
        });
    });

    return normalized;
};

const isDateBlock = (block) => {
    // Check label if it exists
    if (block.label && block.label.toLowerCase().includes('date')) return true;

    // Regex check for common date formats
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{2}-\d{2})/;
    return datePattern.test(block.value);
};

const normalizeDate = (dateString) => {
    // Try to parse string to Date object
    // Handle MM/DD/YYYY
    const date = new Date(dateString);

    // If invalid, return original
    if (isNaN(date.getTime())) return dateString;

    // Return YYYY-MM-DD
    return date.toISOString().split('T')[0];
};
