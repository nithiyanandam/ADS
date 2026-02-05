
import React, { useState, useEffect } from 'react';
import { uploadRulebook, listRulebooks, clearRulebooks } from '../services/advisoryService';
import { IconFile, IconCheckCircle, IconTrash } from './Icons';

function RulebookManager() {
    const [rulebooks, setRulebooks] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        const files = await listRulebooks();
        setRulebooks(files);
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            await uploadRulebook(file);
            await loadRules();
        } catch (err) {
            alert("Upload failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleClear = async () => {
        if (!confirm("Are you sure you want to clear ALL rulebooks? This cannot be undone.")) return;
        try {
            await clearRulebooks();
            setRulebooks([]); // clear local state
        } catch (err) {
            alert("Clear failed: " + err.message);
        }
    };

    return (
        <div style={{ padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                Governance Rulebooks
            </h3>

            <div style={{ marginBottom: '15px' }}>
                {rulebooks.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>No rulebooks indexed.</p>
                ) : (
                    <div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                            {rulebooks.map((rb, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    fontSize: '12px', background: '#f0fdf4', color: '#166534',
                                    padding: '4px 8px', borderRadius: '4px', border: '1px solid #bbf7d0'
                                }}>
                                    <IconCheckCircle size={12} />
                                    {rb}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleClear}
                            style={{
                                fontSize: '11px', color: '#b91c1c', background: 'none', border: 'none',
                                cursor: 'pointer', textDecoration: 'underline'
                            }}
                        >
                            Clear Database
                        </button>
                    </div>
                )}
            </div>

            <div style={{ position: 'relative' }}>
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleUpload}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                />
                <button style={{
                    width: '100%', padding: '8px', fontSize: '13px',
                    background: uploading ? '#e5e7eb' : '#eff6ff',
                    color: uploading ? '#6b7280' : '#1d4ed8',
                    border: '1px dashed #bfdbfe', borderRadius: '6px',
                    cursor: 'pointer'
                }}>
                    {uploading ? 'Indexing...' : '+ Upload Design Spec (PDF)'}
                </button>
            </div>
            <p style={{ fontSize: '10px', color: '#9ca3af', marginTop: '5px' }}>
                * Uploading will index the document into the RAG Knowledge Base.
            </p>
        </div>
    );
}

export default RulebookManager;
