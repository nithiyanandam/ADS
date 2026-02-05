import React, { useState, useEffect, useMemo } from 'react';
import { IconFolder, IconFile, IconCheckCircle, IconAlertTriangle, IconArrowRight, IconSparkles } from './Icons'; // Assuming Sparkles added or use Folder
import { matchFilenamesWithAI } from '../services/fileMatchingService';

/**
 * DirectoryUpload Component
 * 
 * Allows users to upload two folders (Old vs New).
 * Automatically validates and matches files based on filenames.
 */
function DirectoryUpload({ onBatchStart, aiConfig }) {
    const [oldFiles, setOldFiles] = useState([]);
    const [newFiles, setNewFiles] = useState([]);



    const handleFolderSelect = (e, type) => {
        // Filter for PDFs only
        const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
        if (files.length === 0) {
            alert("No PDF files found in the selected folder.");
            return;
        }
        if (type === 'old') setOldFiles(files);
        else setNewFiles(files);
    };

    // AI Matching State
    const [matchingStrategy, setMatchingStrategy] = useState('exact'); // 'exact' | 'ai'
    const [isMatching, setIsMatching] = useState(false);
    const [aiMatches, setAiMatches] = useState(null); // Cache AI results

    const { pairs, unmatched } = useMemo(() => {
        const paired = [];
        const leftOver = [];
        const usedNewIndices = new Set();
        const usedOldIndices = new Set();

        // Strategy: EXACT
        if (matchingStrategy === 'exact') {
            const newFileMap = new Map();
            newFiles.forEach((f, index) => {
                if (!newFileMap.has(f.name)) newFileMap.set(f.name, { file: f, index });
            });

            oldFiles.forEach((oFile, oIndex) => {
                if (newFileMap.has(oFile.name)) {
                    const match = newFileMap.get(oFile.name);
                    paired.push({
                        id: oFile.name,
                        oldFile: oFile,
                        newFile: match.file
                    });
                    usedNewIndices.add(match.index);
                    usedOldIndices.add(oIndex);
                }
            });
        }
        // Strategy: AI
        else if (matchingStrategy === 'ai' && aiMatches) {
            // Use cached AI matches
            const oldMap = new Map(oldFiles.map((f, i) => [f.name, { file: f, index: i }]));
            const newMap = new Map(newFiles.map((f, i) => [f.name, { file: f, index: i }]));

            aiMatches.forEach(match => {
                const o = oldMap.get(match.old);
                const n = newMap.get(match.new);
                if (o && n) {
                    paired.push({
                        id: `${match.old} -> ${match.new}`,
                        oldFile: o.file,
                        newFile: n.file
                    });
                    usedOldIndices.add(o.index);
                    usedNewIndices.add(n.index);
                }
            });
        }

        // Calculate leftovers
        oldFiles.forEach((f, i) => {
            if (!usedOldIndices.has(i)) leftOver.push({ file: f, side: 'old' });
        });
        newFiles.forEach((f, i) => {
            if (!usedNewIndices.has(i)) leftOver.push({ file: f, side: 'new' });
        });

        return { pairs: paired, unmatched: leftOver };
    }, [oldFiles, newFiles, matchingStrategy, aiMatches]);

    const runAiMatching = async () => {
        if (!aiConfig.apiKey) {
            alert("Please configure an AI API Key in settings first.");
            return;
        }
        setIsMatching(true);
        try {
            const matches = await matchFilenamesWithAI(oldFiles, newFiles, aiConfig);
            setAiMatches(matches);
            setMatchingStrategy('ai');
        } catch (e) {
            alert("AI Matching Failed: " + e.message);
        } finally {
            setIsMatching(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>Batch Folder Comparison</h2>
                <div style={{ fontSize: '13px', color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: '12px' }}>
                    Matching Strategy: <strong>{matchingStrategy === 'exact' ? 'Exact Filename' : 'AI Smart Match'}</strong>
                </div>
            </div>

            {/* AI Control */}
            {oldFiles.length > 0 && newFiles.length > 0 && (
                <div style={{ textAlign: 'right', marginBottom: '10px' }}>
                    <button
                        onClick={runAiMatching}
                        disabled={isMatching}
                        style={{
                            padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db',
                            background: 'white', color: '#4b5563', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'
                        }}
                    >
                        {isMatching ? 'Analyzing...' : '⚡ Smart Match with AI'}
                    </button>
                </div>
            )}

            {/* Upload Zone */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '30px' }}>
                {/* Old Folder */}
                <div className="dropzone" style={uploadStyle}>
                    <IconFolder size={40} color={oldFiles.length ? '#2563eb' : '#9ca3af'} />
                    <h3 style={labelStyle}>Old Version Folder</h3>
                    <p style={countStyle}>{oldFiles.length} files loaded</p>
                    <input
                        type="file"
                        webkitdirectory="true"
                        directory="true"
                        multiple
                        onChange={(e) => handleFolderSelect(e, 'old')}
                        style={{ marginTop: '10px' }}
                    />
                </div>

                {/* New Folder */}
                <div className="dropzone" style={uploadStyle}>
                    <IconFolder size={40} color={newFiles.length ? '#2563eb' : '#9ca3af'} />
                    <h3 style={labelStyle}>New Version Folder</h3>
                    <p style={countStyle}>{newFiles.length} files loaded</p>
                    <input
                        type="file"
                        webkitdirectory="true"
                        directory="true"
                        multiple
                        onChange={(e) => handleFolderSelect(e, 'new')}
                        style={{ marginTop: '10px' }}
                    />
                </div>
            </div>

            {/* Validation & Results */}
            {(oldFiles.length > 0 || newFiles.length > 0) && (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '15px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ color: '#374151' }}>Matched Pairs ({pairs.length})</strong>
                        {unmatched.length > 0 && <strong style={{ color: '#d97706' }}>Unmatched ({unmatched.length})</strong>}
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '15px' }}>
                        {pairs.length === 0 && unmatched.length === 0 && (
                            <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Upload folders to see matches...</p>
                        )}

                        {pairs.map((p, i) => (
                            <div key={i} style={matchItemStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <IconCheckCircle size={16} color="#166534" />
                                    <span style={{ fontSize: '14px', color: '#111827' }}>{p.id}</span>
                                </div>
                                <span style={{ fontSize: '12px', color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>Ready</span>
                            </div>
                        ))}

                        {unmatched.map((u, i) => (
                            <div key={'u' + i} style={unmatchItemStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <IconAlertTriangle size={16} color="#d97706" />
                                    <span style={{ fontSize: '14px', color: '#374151' }}>{u.file.name}</span>
                                </div>
                                <span style={{ fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: '10px' }}>
                                    {u.side === 'old' ? 'Missing in New' : 'Missing in Old'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div style={{ padding: '15px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
                        <button
                            onClick={() => onBatchStart(pairs)}
                            disabled={pairs.length === 0}
                            style={{
                                width: '100%',
                                padding: '12px',
                                fontSize: '16px',
                                background: pairs.length === 0 ? '#9ca3af' : '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: pairs.length === 0 ? 'not-allowed' : 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            Start Batch Processing ({pairs.length} files)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Styles
const uploadStyle = {
    padding: '30px',
    border: '2px dashed #e1e4e8',
    borderRadius: '8px',
    textAlign: 'center',
    background: '#f8fafc',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
};

const labelStyle = { margin: '10px 0 5px', fontSize: '15px', color: '#4b5563' };
const countStyle = { margin: '0 0 10px', fontSize: '13px', color: '#6b7280' };

const matchItemStyle = {
    padding: '8px 12px',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
};

const unmatchItemStyle = {
    ...matchItemStyle,
    background: '#fffbeb'
};

export default DirectoryUpload;
