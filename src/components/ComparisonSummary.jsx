import React from 'react';
import { IconCheckCircle, IconAlertTriangle, IconXCircle, IconArrowRight } from './Icons';

/**
 * ComparisonSummary Component
 * 
 * Purpose:
 * - Display a high-level summary of comparison results.
 * - Matches the visual design: stacked color-coded bars with icons.
 */
function ComparisonSummary({ summaryData, metadata, onReviewClick, onExport }) {
    // Mock data if not provided
    const data = summaryData || {
        expected: 0,
        uncertain: 0,
        defects: 0
    };

    const SummaryRow = ({ type, count, label, colorBg, colorText, colorBorder, icon }) => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: colorBg,
            border: `1px solid ${colorBorder}`,
            borderRadius: '6px',
            marginBottom: '12px',
            cursor: 'pointer',
            color: colorText
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {icon}
                <div style={{ fontSize: '16px', fontWeight: '500' }}>
                    <span style={{ fontWeight: '700', marginRight: '5px', fontSize: '18px' }}>{count}</span>
                    {label}
                </div>
            </div>
            <IconArrowRight size={20} color={colorText} />
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '5px' }}>
                    {metadata?.title || 'Comparison Summary'}
                </h2>
                {metadata?.subtitle && (
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                        {metadata.subtitle}
                    </p>
                )}
            </div>

            <div style={{ marginBottom: '30px' }}>
                <SummaryRow
                    type="expected"
                    count={data.expected}
                    label="Expected Differences"
                    colorBg="#f0fdf4"
                    colorBorder="#bbf7d0"
                    colorText="#166534"
                    icon={<IconCheckCircle size={28} color="#166534" />}
                />
                <SummaryRow
                    type="uncertain"
                    count={data.uncertain}
                    label="Need Review"
                    colorBg="#fffbeb"
                    colorBorder="#fde68a"
                    colorText="#92400e"
                    icon={<IconAlertTriangle size={28} color="#92400e" />}
                />
                <SummaryRow
                    type="defects"
                    count={data.defects}
                    label="Likely Defects"
                    colorBg="#fef2f2"
                    colorBorder="#fecaca"
                    colorText="#991b1b"
                    icon={<IconXCircle size={28} color="#991b1b" />}
                />
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                    onClick={onReviewClick}
                    style={{
                        padding: '12px 30px',
                        fontSize: '16px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    Review Differences
                </button>
                {onExport && (
                    <button
                        onClick={onExport}
                        style={{
                            padding: '12px 30px',
                            fontSize: '16px',
                            background: 'white',
                            color: '#4b5563',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Export Report
                    </button>
                )}
            </div>
        </div>
    );
}

export default ComparisonSummary;
