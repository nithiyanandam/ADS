/**
 * Mock PDF Parser Service
 * 
 * Purpose:
 * - Simulates the extraction of text and structure from PDF files.
 * - Returns a structured JSON object with pages, blocks, and fields.
 * - content includes: type (header, paragraph, field), value, location.
 */

export const parsePdf = async (file) => {
    // Simulate async processing
    return new Promise((resolve) => {
        setTimeout(() => {
            // Return different structure based on file "type" (heuristic: if name contains 'old' or 'new' or just random)
            // For POC, we'll assume the first call is Old and second is New, or we can just pass a flag.
            // But purely based on file content mock:

            const isNew = file.name.toLowerCase().includes('new');

            if (isNew) {
                resolve(getNewDocumentJson());
            } else {
                resolve(getOldDocumentJson());
            }
        }, 1000);
    });
};

// MOCK DATA: Old Document (v1.0)
const getOldDocumentJson = () => ({
    metadata: { title: "System Design Document", version: "1.0" },
    pages: [
        {
            pageNumber: 1,
            blocks: [
                {
                    id: "block_1",
                    type: "header",
                    value: "System Design Document v1.0",
                    location: { page: 1, x: 50, y: 50 }
                },
                {
                    id: "block_2",
                    type: "field",
                    label: "Effective Date",
                    value: "01/01/2026",
                    location: { page: 1, x: 50, y: 100 }
                },
                {
                    id: "block_3",
                    type: "paragraph",
                    value: "The system shall be deployed on port 8080.",
                    location: { page: 1, x: 50, y: 150 }
                },
                {
                    id: "block_4",
                    type: "table_row",
                    value: "Constraint | None",
                    location: { page: 1, x: 50, y: 200 }
                }
            ]
        }
    ]
});

// MOCK DATA: New Document (v1.1)
const getNewDocumentJson = () => ({
    metadata: { title: "System Design Document", version: "1.1" },
    pages: [
        {
            pageNumber: 1,
            blocks: [
                {
                    id: "block_1",
                    type: "header",
                    value: "System Design Document v1.1", // Changed (Content)
                    location: { page: 1, x: 50, y: 50 }
                },
                {
                    id: "block_2",
                    type: "field",
                    label: "Effective Date",
                    value: "2026-01-15", // Changed (Format + Value)
                    location: { page: 1, x: 50, y: 100 }
                },
                {
                    id: "block_3",
                    type: "paragraph",
                    value: "The system shall be deployed on port 9090.", // Changed (Content - critical?)
                    location: { page: 1, x: 50, y: 160 } // Layout changed slightly
                },
                {
                    id: "block_4", // "Constraint" row removed? Or changed? Let's say it exists but value changed.
                    type: "table_row",
                    value: "Constraint | HTTPS Required",
                    location: { page: 1, x: 50, y: 200 }
                },
                {
                    id: "block_5", // New block
                    type: "paragraph",
                    value: "New security compliance section added.",
                    location: { page: 1, x: 50, y: 250 }
                }
            ]
        }
    ]
});
