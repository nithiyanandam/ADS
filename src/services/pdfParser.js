import * as pdfjsLib from 'pdfjs-dist';

// We need to set the worker source. 
// In a Vite app, we can point to the file in /public or import it directly if configured.
// For simplicity in this POC, we will assume the worker file is copied to /public/pdf.worker.min.mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Parses a PDF file and extracts text content.
 * @param {File} file - The PDF file object.
 * @param {Object} config - { useRemoteParser: boolean, remoteUrl: string }
 * @returns {Promise<Object>} - Structured JSON for comparison.
 */
export async function parsePdf(file, config = {}) {
    // 1. Remote Parsing (Docling / Backend)
    if (config.useRemoteParser) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('output_format', config.doclingFormat || 'markdown');

            const url = config.remoteUrl || 'http://localhost:8000/parse';
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Remote Parser Error: ${response.status}`);

            const data = await response.json();

            // Handle different content types
            let contentValue = data.content;
            if (typeof contentValue === 'object') {
                contentValue = JSON.stringify(contentValue, null, 2);
            }

            return {
                metadata: { title: data.filename, pageCount: 1 },
                pages: [
                    {
                        pageNumber: 1,
                        blocks: [
                            {
                                id: 'docling_full_text',
                                type: 'paragraph',
                                value: contentValue,
                                location: { page: 1, x: 0, y: 0 }
                            }
                        ]
                    }
                ]
            };

        } catch (e) {
            console.error("Remote parsing failed:", e);

            // Check Fallback Setting (Default to true if undefined)
            if (config.enableFallback === false) {
                throw new Error(`Docling Backend Failed: ${e.message}. Fallback is disabled.`);
            }

            console.warn("Falling back to local pdf.js parser...");
            // Fallthrough to local
        }
    }

    // 2. Local Parsing (pdf.js)
    const arrayBuffer = await file.arrayBuffer();

    // Load document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const pages = [];
    const meta = {
        title: file.name,
        pageCount: pdf.numPages
    };

    // Iterate through pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Group raw items into lines/blocks
        const blocks = groupTextItems(textContent.items, i);

        pages.push({
            pageNumber: i,
            blocks: blocks
        });
    }

    return {
        metadata: meta,
        pages: pages
    };
}

/**
 * Heuristic to group floating text items into lines.
 * pdf.js returns individual strings at (x,y). We group those with similar Y into lines.
 */
function groupTextItems(items, pageNum) {
    if (!items || items.length === 0) return [];

    // 1. Sort by Y (descending - PDF coords start bottom-left usually, but pdf.js handles this via viewport? 
    // Actually pdf.js raw output: transform[5] is Y. Larger Y is usually HIGHER up in standard PDF coord, 
    // but let's just group by proximity first.
    // transform is [scaleX, skewY, skewX, scaleY, x, y]

    // Sort items by Y (descending for top-to-bottom), then X (ascending for left-to-right)
    items.sort((a, b) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        if (Math.abs(yA - yB) > 5) { // If Y is different by more than 5 units
            return yB - yA; // Top first
        }
        return a.transform[4] - b.transform[4]; // Left first
    });

    const blocks = [];
    let currentLine = null;
    let lastY = null;

    items.forEach((item, index) => {
        const text = item.str.trim();
        if (!text) return; // Skip empty whitespace items

        const x = item.transform[4];
        const y = item.transform[5];

        // Is this a new line?
        // Tolerance of 5 units for "same line"
        if (lastY === null || Math.abs(y - lastY) > 5) {
            // Push previous line if exists
            if (currentLine) {
                blocks.push(buildBlock(currentLine, pageNum, blocks.length));
            }
            // Start new line
            currentLine = {
                textParts: [text],
                x: x,
                y: y
            };
            lastY = y;
        } else {
            // Continue same line
            currentLine.textParts.push(text);
        }
    });

    // Push final line
    if (currentLine) {
        blocks.push(buildBlock(currentLine, pageNum, blocks.length));
    }

    return blocks;
}

function buildBlock(lineData, pageNum, index) {
    const fullText = lineData.textParts.join(' ');

    // Simple Heuristic for type detection
    let type = 'paragraph';
    if (fullText.length < 50 && /^\d/.test(fullText)) type = 'field'; // Starts with number? maybe field? Very naive.
    if (fullText.toUpperCase() === fullText && fullText.length > 5) type = 'header'; // ALL CAPS? Header?

    return {
        id: `page_${pageNum}_block_${index}`,
        type: type,
        value: fullText,
        location: { page: pageNum, x: Math.round(lineData.x), y: Math.round(lineData.y) }
    };
}
