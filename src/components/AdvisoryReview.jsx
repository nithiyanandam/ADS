
import React, { useState, useEffect } from 'react';
import RulebookManager from './RulebookManager';
import { retrieveRelevantRules } from '../services/advisoryService';
import { analyzeDiffWithLLM } from '../services/llmService';

// Debug Component (Inline)
const NetworkDiagnostics = () => {
    const [status, setStatus] = useState('Idle');
    const [details, setDetails] = useState('');

    const runDiagnostics = async () => {
        setStatus('Running...');
        setDetails('');
        try {
            // 1. Check Root Reachability
            try {
                const res = await fetch('http://localhost:8000/');
                const text = await res.text(); // consume body
                if (!res.ok) throw new Error(`Root status: ${res.status}`);
                setDetails(prev => prev + "✅ Backend Root: OK\n");
            } catch (rootErr) {
                setDetails(prev => prev + `❌ Backend Root: FAILED (${rootErr.message})\n`);
            }

            // 2. Check Retrieval Endpoint (Smoke Test)
            try {
                const res = await fetch('http://localhost:8000/advisory/retrieve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ diff_text: "Test Connection" })
                });
                if (!res.ok) {
                    throw new Error(`Retrieve status: ${res.status}`);
                }
                const data = await res.json();
                setDetails(prev => prev + `✅ Prediction Retrieval: OK (Found ${data.rules?.length} rules)\n`);
            } catch (retErr) {
                setDetails(prev => prev + `❌ Retrieval Endpoint: FAILED (${retErr.message})\n`);
            }
            setStatus('Complete');
        } catch (e) {
            setStatus('Error');
            setDetails(e.message);
        }
    };

    return (
        <div style={{ marginTop: 'auto', padding: '10px', background: '#f3f4f6', borderTop: '1px solid #e5e7eb' }}>
            <h5 style={{ margin: '0 0 5px', fontSize: '12px', color: '#4b5563' }}>Network Diagnostics</h5>
            <button
                onClick={runDiagnostics}
                style={{ width: '100%', padding: '4px', fontSize: '11px', cursor: 'pointer', marginBottom: '5px' }}
            >
                {status === 'Running...' ? 'Testing...' : 'Test Connection'}
            </button>
            {details && (
                <pre style={{ fontSize: '10px', color: '#374151', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                    {details}
                </pre>
            )}
        </div>
    );
};

/**
 * AdvisoryReview Component (The Sidecar)
 * 
 * Displays independent Compliance Analysis for the currently selected difference.
 */
function AdvisoryReview({ selectedDiff, aiConfig }) {
    const [loading, setLoading] = useState(false);
    const [advisoryResult, setAdvisoryResult] = useState(null);
    const [relevantRules, setRelevantRules] = useState([]);

    // When the user selects a different difference, we automatically "Audit" it.
    useEffect(() => {
        if (selectedDiff && aiConfig.apiKey) {
            runAudit(selectedDiff);
        } else {
            setAdvisoryResult(null);
            setRelevantRules([]);
        }
    }, [selectedDiff]);

    const runAudit = async (diff) => {
        setLoading(true);
        setAdvisoryResult(null);
        try {
            // 1. Retrieve Rules (RAG)
            // Construct a query text from the diff context
            const query = `Field: ${diff.path || 'Unknown'}. Change: ${diff.changeType}. Content: ${diff.newValue || diff.oldValue}`;
            const rules = await retrieveRelevantRules(query);
            setRelevantRules(rules);

            if (rules.length === 0) {
                setAdvisoryResult({
                    status: 'Neutral',
                    reasoning: 'No specific rules found in the Rulebook for this field.'
                });
                return;
            }

            // 2. Reason (LLM)
            const advisoryPrompt = `
            ROLE: You are a Compliance Auditor.
            TASK: Verify if the difference between the Old and New values is justified by the provided Rulebook/Specification documents.
            
            CONTEXT:
            Field: ${diff.path}
            Change Type: ${diff.changeType}
            Old Value: ${diff.oldValue}
            New Value: ${diff.newValue}
            
            KNOWLEDGE BASE (Retrieved Rule Fragments):
            ${rules.map(r => `- ${r.text} (Source: ${r.source})`).join('\n')}
            
            ANALYSIS LOGIC:
            1. EXPECTED DIFFERENCE: The change aligns with a rule update, design shift, or specific instruction in the Rulebook.
            2. DEFECT: The New Value clearly violates a rule or standard defined in the text.
            3. REQUIRES REVIEW: The rule is missing, ambiguous, or the change cannot be explicitly verified.
            
            OUTPUT (JSON ONLY):
            {
                "decision": "Expected Difference" | "Defect" | "Requires Review",
                "explanation": "Brief reasoning citing the specific rule."
            }
            `;

            const auditConfig = {
                ...aiConfig,
                customRules: advisoryPrompt
            };

            const analysis = await analyzeDiffWithLLM(diff, auditConfig);

            setAdvisoryResult({
                status: analysis.decision,
                reasoning: analysis.explanation
            });

        } catch (e) {
            console.error("Audit failed", e);
            setAdvisoryResult({ status: 'Error', reasoning: 'Audit failed: ' + e.message });
        } finally {
            setLoading(false);
        }
    };

    if (!selectedDiff) {
        return (
            <div style={containerStyle}>
                <div style={headerStyle}>Compliance Advisor</div>
                <div style={{ padding: '20px', color: '#9ca3af', textAlign: 'center' }}>
                    Select a difference to run compliance audit.
                </div>
                <RulebookManager />
                <NetworkDiagnostics />
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>Compliance Advisor</div>

            <RulebookManager />

            <div style={{ padding: '15px', borderTop: '1px solid #e5e7eb', flex: 1, overflowY: 'auto' }}>
                <h4 style={{ fontSize: '13px', margin: '0 0 10px', color: '#374151' }}>
                    Audit for: <code>{selectedDiff.path}</code>
                </h4>

                {loading ? (
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>
                        Running RAG Analysis...
                    </div>
                ) : advisoryResult ? (
                    <div>
                        <div style={{
                            padding: '10px', borderRadius: '6px', marginBottom: '15px',
                            background: getBgColor(advisoryResult.status),
                            border: '1px solid ' + getBorderColor(advisoryResult.status),
                            color: getTextColor(advisoryResult.status)
                        }}>
                            <strong style={{ display: 'block', marginBottom: '5px' }}>
                                Assessment: {advisoryResult.status}
                            </strong>
                            <p style={{ margin: 0, fontSize: '12px' }}>{advisoryResult.reasoning}</p>
                        </div>

                        {relevantRules.length > 0 && (
                            <div>
                                <strong style={{ fontSize: '12px', color: '#6b7280' }}>Relevant Rules Found:</strong>
                                <ul style={{ margin: '5px 0 0', paddingLeft: '15px', fontSize: '11px', color: '#4b5563' }}>
                                    {relevantRules.map((r, i) => (
                                        <li key={i} style={{ marginBottom: '5px' }}>
                                            "{r.text.substring(0, 100)}..." <i style={{ color: '#9ca3af' }}>— {r.source}</i>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            <NetworkDiagnostics />
        </div>
    );
}

// Helpers for styling
const containerStyle = {
    width: '300px',
    background: '#fcfcfc',
    borderLeft: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
};

const headerStyle = {
    padding: '15px',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    background: '#fff'
};

const getBgColor = (s) => s === 'Expected Difference' ? '#f0fdf4' : s === 'Defect' ? '#fef2f2' : '#fffbeb';
const getBorderColor = (s) => s === 'Expected Difference' ? '#bbf7d0' : s === 'Defect' ? '#fecaca' : '#fde68a';
const getTextColor = (s) => s === 'Expected Difference' ? '#166534' : s === 'Defect' ? '#991b1b' : '#b45309';

export default AdvisoryReview;
