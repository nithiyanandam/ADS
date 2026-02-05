/**
 * Comparison Engine Service
 * 
 * Purpose:
 * - Compares two normalized JSON documents.
 * - Detects differences: CONTENT, ADDED, REMOVED.
 * - Identifies layout-only changes (to be ignored or flagged).
 */

export const compareDocuments = (oldDoc, newDoc) => {
    const differences = [];

    // 1. Compare Metadata (Title/Version)
    if (oldDoc.metadata.version !== newDoc.metadata.version) {
        differences.push({
            id: 'meta_version',
            path: 'metadata.version',
            oldValue: oldDoc.metadata.version,
            newValue: newDoc.metadata.version,
            changeType: 'CONTENT',
            isLayout: false
        });
    }

    // 2. Compare Blocks (Simplification: Assume single page or flat list of blocks)
    // We'll map blocks by ID for easy comparison.
    const oldBlocks = getBlockMap(oldDoc);
    const newBlocks = getBlockMap(newDoc);

    // Check for Modified and Removed blocks
    Object.keys(oldBlocks).forEach(id => {
        const oldBlock = oldBlocks[id];
        const newBlock = newBlocks[id];

        if (!newBlock) {
            // REMOVED
            differences.push({
                id: id,
                path: `page_${oldBlock.location.page}.block_${id}`,
                oldValue: oldBlock.value,
                newValue: null,
                changeType: 'REMOVED',
                isLayout: false
            });
        } else {
            // MODIFIED Check
            if (oldBlock.value !== newBlock.value) {
                differences.push({
                    id: id,
                    path: `page_${oldBlock.location.page}.block_${id}`, // purely UI label
                    fieldLabel: oldBlock.label || "Text Block", // For UI display
                    oldValue: oldBlock.value,
                    newValue: newBlock.value,
                    changeType: 'CONTENT',
                    isLayout: false
                });
            } else {
                // Layout Check (if values are same but location diff)
                // We can ignore this for the Diff List, or log it if needed.
                // The prompt says "Ignore layout-only changes."
                // So we do nothing here.
            }
        }
    });

    // Check for Added blocks
    Object.keys(newBlocks).forEach(id => {
        if (!oldBlocks[id]) {
            const newBlock = newBlocks[id];
            differences.push({
                id: id,
                path: `page_${newBlock.location.page}.block_${id}`,
                fieldLabel: newBlock.label || "New Block",
                oldValue: null,
                newValue: newBlock.value,
                changeType: 'ADDED',
                isLayout: false
            });
        }
    });

    return differences;
};

// Helper: Flatten blocks into a map { id: block }
const getBlockMap = (doc) => {
    const map = {};
    doc.pages.forEach(page => {
        page.blocks.forEach(block => {
            // If no ID, generate one (not robust for real app, ok for POC with mocked IDs)
            const id = block.id || `gen_${Math.random()}`;
            map[id] = block;
        });
    });
    return map;
};
