const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'sample_docs');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// 1. Create Old Design
const docOld = new PDFDocument();
docOld.pipe(fs.createWriteStream(path.join(outputDir, 'system_design_v1.pdf')));

docOld.fontSize(20).text('System Design Document v1.0', 100, 50);
docOld.fontSize(12).text('Effective Date: 01/01/2026', 100, 100);
docOld.text('The system shall be deployed on port 8080.', 100, 150);
docOld.text('Table 1: Constraints', 100, 200);
docOld.text('None', 100, 220);
docOld.end();

// 2. Create New Design
const docNew = new PDFDocument();
docNew.pipe(fs.createWriteStream(path.join(outputDir, 'system_design_v1.1_new.pdf')));

docNew.fontSize(20).text('System Design Document v1.1', 100, 50);
docNew.fontSize(12).text('Effective Date: 2026-01-15', 100, 100);
docNew.text('The system shall be deployed on port 9090.', 100, 160); // Moved Y slightly
docNew.text('Table 1: Constraints', 100, 200);
docNew.text('HTTPS Required', 100, 220);
docNew.text('New Security Compliance Section', 100, 250);
docNew.end();

console.log("Sample PDFs generated in 'sample_docs' folder.");
