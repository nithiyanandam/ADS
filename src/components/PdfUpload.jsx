import React from 'react';
import { IconFolder, IconFile } from './Icons';
import RulebookManager from './RulebookManager';

/**
 * PdfUpload Component
 * 
 * Purpose:
 * - Allow users to upload "Old" and "New" PDF files.
 * - Manage Compliance Rulebooks (RAG).
 */
function PdfUpload({ onUploadComplete }) {
    const [oldFile, setOldFile] = React.useState(null);
    const [newFile, setNewFile] = React.useState(null);

    const handleFileChange = (file, type) => {
        if (file && file.type === 'application/pdf') {
            if (type === 'old') setOldFile(file);
            else setNewFile(file);
        } else {
            alert("Please upload a valid PDF file.");
        }
    };

    const onDrop = (e, type) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        handleFileChange(file, type);
    };

    const onDragOver = (e) => e.preventDefault();

    const handleCompare = () => {
        if (oldFile && newFile) {
            onUploadComplete({ oldFile, newFile });
        } else {
            alert("Please upload both files.");
        }
    };

    const DropZone = ({ label, file, type }) => (
        <div
            onDrop={(e) => onDrop(e, type)}
            onDragOver={onDragOver}
            style={{
                padding: '40px 20px',
                border: '2px dashed #e1e4e8',
                borderRadius: '8px',
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer',
                flex: 1,
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px'
            }}
            className="dropzone"
        >
            <div style={{ color: '#9ca3af', marginBottom: '15px' }}>
                {file ? <IconFile size={48} /> : <IconFolder size={48} />}
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#4b5563', marginBottom: '5px' }}>
                {label}
            </h3>

            {file ? (
                <p style={{ margin: '5px 0', color: '#2563eb', fontWeight: '500' }}>{file.name}</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{
                        background: 'white',
                        border: '1px solid #d1d5db',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: '#374151',
                        fontWeight: '500',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        Upload PDF
                        <input
                            type="file"
                            onChange={(e) => handleFileChange(e.target.files[0], type)}
                            accept=".pdf"
                            style={{ display: 'none' }}
                        />
                    </label>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Or drop a file here</span>
                </div>
            )}

            {/* Hidden input for drop handling fallback if needed, but label covers click */}
        </div>
    );

    return (
        <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1f2937' }}>Upload PDFs</h2>

            {/* Rulebook Management Section (Unified Compliance) */}
            <div style={{ marginBottom: '25px' }}>
                <RulebookManager />
            </div>

            <div style={{ display: 'flex', gap: '24px', marginBottom: '30px' }}>
                <DropZone label="Old PDF" file={oldFile} type="old" />
                <DropZone label="New PDF" file={newFile} type="new" />
            </div>
            <button
                onClick={handleCompare}
                disabled={!oldFile || !newFile}
                style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    background: (!oldFile || !newFile) ? '#9ca3af' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (!oldFile || !newFile) ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                }}
            >
                Compare Files
            </button>
        </div>
    );
}

export default PdfUpload;
