import React, { useMemo } from 'react';
import { IconCheckCircle, IconXCircle, IconAlertTriangle, IconFile, IconArrowRight } from './Icons';

function BatchSummary({ results, onBack, onViewDetails, onExport }) {

    const stats = useMemo(() => {
        return {
            total: results.length,
            passed: results.filter(r => r.status === 'Passed').length,
            failed: results.filter(r => r.status === 'Failed').length,
            review: results.filter(r => r.status === 'Review Needed').length
        };
    }, [results]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Passed': return { bg: '#dcfce7', text: '#166534', icon: <IconCheckCircle size={16} color="#166534" /> };
            case 'Failed': return { bg: '#fee2e2', text: '#991b1b', icon: <IconXCircle size={16} color="#991b1b" /> };
            case 'Review Needed': return { bg: '#fef3c7', text: '#92400e', icon: <IconAlertTriangle size={16} color="#d97706" /> };
            default: return { bg: '#f3f4f6', text: '#374151', icon: null };
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Batch Summary Report</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={onExport}
                        style={{ padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}
                    >
                        Export JSON
                    </button>
                    <button
                        onClick={onBack}
                        style={{ padding: '8px 16px', background: '#2563eb', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'white' }}
                    >
                        Start New Batch
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
                <StatCard label="Total Files" value={stats.total} color="#3b82f6" />
                <StatCard label="Passed" value={stats.passed} color="#166534" />
                <StatCard label="Review Needed" value={stats.review} color="#d97706" />
                <StatCard label="Defects Found" value={stats.failed} color="#dc2626" />
            </div>

            {/* Results Table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                            <th style={{ padding: '12px 20px', color: '#6b7280', fontWeight: '600' }}>File Name</th>
                            <th style={{ padding: '12px 20px', color: '#6b7280', fontWeight: '600' }}>Status</th>
                            <th style={{ padding: '12px 20px', color: '#6b7280', fontWeight: '600' }}>Defects</th>
                            <th style={{ padding: '12px 20px', color: '#6b7280', fontWeight: '600' }}>Uncertain</th>
                            <th style={{ padding: '12px 20px', color: '#6b7280', fontWeight: '600' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((r, i) => {
                            const style = getStatusColor(r.status);
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <IconFile size={16} color="#6b7280" />
                                        <span style={{ fontWeight: '500', color: '#111827' }}>{r.fileId}</span>
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500',
                                            background: style.bg, color: style.text
                                        }}>
                                            {style.icon} {r.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 20px', color: r.defects > 0 ? '#dc2626' : '#9ca3af', fontWeight: r.defects > 0 ? '600' : '400' }}>
                                        {r.defects}
                                    </td>
                                    <td style={{ padding: '12px 20px', color: r.uncertain > 0 ? '#d97706' : '#9ca3af', fontWeight: r.uncertain > 0 ? '600' : '400' }}>
                                        {r.uncertain}
                                    </td>
                                    <td style={{ padding: '12px 20px' }}>
                                        <button
                                            onClick={() => onViewDetails(r)}
                                            style={{
                                                background: 'none', border: '1px solid #d1d5db', borderRadius: '4px',
                                                padding: '4px 10px', cursor: 'pointer', color: '#374151', fontSize: '12px',
                                                display: 'flex', alignItems: 'center', gap: '5px'
                                            }}
                                        >
                                            View Details <IconArrowRight size={12} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const StatCard = ({ label, value, color }) => (
    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '5px' }}>{label}</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: color }}>{value}</div>
    </div>
);

export default BatchSummary;
