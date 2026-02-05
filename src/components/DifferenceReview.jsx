import React, { useState } from 'react';
import { IconLightbulb, IconArrowRight, IconCheckCircle, IconXCircle } from './Icons';

/**
 * DifferenceReview Component
 * 
 * Purpose:
 * - Display individual differences for human review.
 * - Matches the visual design: Table layout for diffs, Blue card for AI decision.
 */
import AdvisoryReview from './AdvisoryReview';

/**
 * DifferenceReview Component
 *
 * One screen, two views:
 * 1. Operational Review (Left Main)
 * 2. Governance Advisory (Right Sidebar - Toggleable)
 */
function DifferenceReview({ differences, onBack, onReviewDecision, aiConfig }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAdvisory, setShowAdvisory] = useState(false);

    // Safety check
    if (!differences || differences.length === 0) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h2 style={{ color: '#374151', marginBottom: '10px' }}>Review Complete</h2>
                <p style={{ color: '#6b7280', marginBottom: '20px' }}>No differences to review.</p>
                <button onClick={onBack} style={{ background: '#3b82f6', color: 'white' }}>Back to Summary</button>
            </div>
        );
    }

    // Check if we reached the end
    if (currentIndex >= differences.length) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <IconCheckCircle size={48} color="#166534" />
                <h2 style={{ color: '#374151', margin: '20px 0 10px' }}>Review Complete</h2>
                <p style={{ color: '#6b7280', marginBottom: '20px' }}>You have reviewed all {differences.length} differences.</p>
                <button onClick={onBack} style={{ background: '#3b82f6', color: 'white' }}>Back to Summary</button>
            </div>
        );
    }

    const currentDiff = differences[currentIndex];

    // ... handleDecision helper ...
    const handleDecision = (decision) => {
        onReviewDecision(currentDiff.id, decision);
        if (currentIndex < differences.length) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const aiDecision = currentDiff.aiAnalysis || {};
    const renderValue = (val) => {
        if (val === null || val === undefined) return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>(null)</span>;
        if (typeof val === 'string') return val;
        return JSON.stringify(val, null, 2);
    };

    return (
        <div style={{ display: 'flex', height: '100%' }}>
            {/* Main Operational View */}
            <div style={{ flex: 1, paddingRight: showAdvisory ? '20px' : '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>Review Differences</h2>

                    {/* Toggle Advisory Sidecar */}
                    <button
                        onClick={() => setShowAdvisory(!showAdvisory)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: showAdvisory ? '#e0e7ff' : 'white',
                            color: showAdvisory ? '#4338ca' : '#6b7280',
                            border: '1px solid ' + (showAdvisory ? '#a5b4fc' : '#d1d5db'),
                            padding: '6px 12px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontWeight: '500'
                        }}
                    >
                        <IconLightbulb size={14} />
                        {showAdvisory ? 'Hide Advisor' : 'Show Compliance Advisor'}
                    </button>
                </div>

                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '15px' }}>
                    Difference {currentIndex + 1} of {differences.length}
                </p>

                {/* Difference Table (Existing) */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                    {/* Headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ padding: '10px 15px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>Old</div>
                        <div style={{ padding: '10px 15px', fontWeight: '600', color: '#4b5563', fontSize: '14px' }}>New</div>
                    </div>

                    {/* Content */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'white' }}>
                        <div style={{ padding: '15px', borderRight: '1px solid #e5e7eb' }}>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827', marginBottom: '4px' }}>
                                {currentDiff.fieldLabel || currentDiff.path}
                            </div>
                            <div style={{ fontSize: '15px', color: '#374151', whiteSpace: 'pre-wrap' }}>
                                {renderValue(currentDiff.oldValue)}
                            </div>
                        </div>
                        <div style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <IconArrowRight size={16} color="#6b7280" />
                            <div style={{ fontSize: '15px', color: '#374151', fontWeight: '500', whiteSpace: 'pre-wrap' }}>
                                {renderValue(currentDiff.newValue)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Decision Card (Enhanced with Compliance Risk) */}
                <div style={{
                    border: '1px solid #bfdbfe',
                    background: '#eff6ff',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                        <IconLightbulb size={24} color="#2563eb" />
                        <h4 style={{ margin: 0, color: '#1e40af', fontSize: '18px', fontWeight: '600' }}>
                            {aiDecision.decision}
                        </h4>
                        {aiDecision.riskAssessment && (
                            <span style={{
                                background: aiDecision.riskAssessment.overall === 'High' ? '#fee2e2' : '#dcfce7',
                                color: aiDecision.riskAssessment.overall === 'High' ? '#991b1b' : '#166534',
                                padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
                            }}>
                                Risk: {aiDecision.riskAssessment.overall}
                            </span>
                        )}
                        <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: 'auto' }}>
                            Rules Found: {aiDecision._debugRuleCount !== undefined ? aiDecision._debugRuleCount : '?'}
                        </span>
                    </div>

                    {aiDecision.aiReasoning && (
                        <div style={{ marginBottom: '15px', background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                            <strong style={{ fontSize: '13px', color: '#1e40af', display: 'block', marginBottom: '5px' }}>AI COMPLIANCE REASONING:</strong>
                            <p style={{ margin: 0, color: '#374151', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                                {aiDecision.aiReasoning}
                            </p>
                        </div>
                    )}

                    {aiDecision.ruleHighlights && (
                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ fontSize: '13px', color: '#b91c1c' }}>VIOLATIONS / HIGHLIGHTS:</strong>
                            <p style={{ margin: '4px 0', color: '#7f1d1d', fontSize: '14px' }}>
                                {aiDecision.ruleHighlights}
                            </p>
                        </div>
                    )}

                    {aiDecision.riskAssessment && (
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', fontSize: '12px' }}>
                            <div style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                <strong>Compliance:</strong> {aiDecision.riskAssessment.compliance}
                            </div>
                            <div style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                <strong>Contractual:</strong> {aiDecision.riskAssessment.contractual}
                            </div>
                            <div style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                <strong>Operational:</strong> {aiDecision.riskAssessment.operational}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        <button
                            onClick={() => handleDecision('Accepted')}
                            style={{
                                padding: '8px 24px', background: 'white', color: '#1e40af', border: '1px solid #bfdbfe',
                                borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', minWidth: '100px'
                            }}
                        >
                            Accept
                        </button>
                        <button
                            onClick={() => handleDecision('Defect')}
                            style={{
                                padding: '8px 24px', background: 'white', color: '#1e40af', border: '1px solid #bfdbfe',
                                borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', minWidth: '100px'
                            }}
                        >
                            Mark as Defect
                        </button>
                    </div>
                </div>

                {/* Navigation Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                    <button
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                        disabled={currentIndex === 0}
                        style={{ background: '#f3f4f6', color: currentIndex === 0 ? '#d1d5db' : '#374151', border: '1px solid #e5e7eb', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', padding: '8px 16px', borderRadius: '4px' }}
                    >
                        - Back
                    </button>

                    <button
                        onClick={() => setCurrentIndex(Math.min(differences.length, currentIndex + 1))}
                        disabled={currentIndex >= differences.length}
                        style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Advisory Sidecar (Right Panel) */}
            {showAdvisory && (
                <div style={{ width: '300px', flexShrink: 0 }}>
                    <AdvisoryReview selectedDiff={currentDiff} aiConfig={aiConfig} />
                </div>
            )}
        </div>
    );
}

export default DifferenceReview;
