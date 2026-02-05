import React, { useState, useEffect } from 'react';
import { fetchOpenRouterModels, verifyApiConnection } from '../services/llmService';
import { clearMemory } from '../services/memoryStore';
import { IconTrash, IconCheckCircle, IconXCircle, IconAlertTriangle } from './Icons';

const LOCAL_STORAGE_KEY = 'docdiff_ai_config_v1';

function SettingsModal({ isOpen, onClose, onConfigSave }) {
    if (!isOpen) return null;

    const [config, setConfig] = useState({
        provider: 'gemini',
        apiKey: '',
        model: 'gemini-1.5-flash',
        baseUrl: 'https://openrouter.ai/api/v1',
        customRules: '',
        doclingFormat: 'markdown' // markdown, json, html, text
    });

    // UI States
    const [availableModels, setAvailableModels] = useState([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [testStatus, setTestStatus] = useState(null); // 'idle', 'testing', 'success', 'error'
    const [testMessage, setTestMessage] = useState('');

    // Load from cache on mount
    useEffect(() => {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
            try {
                setConfig(JSON.parse(cached));
            } catch (e) {
                console.error("Failed to parse cached config", e);
            }
        }
    }, []);

    // Fetch models if OpenRouter
    useEffect(() => {
        if (config.provider === 'openrouter' && availableModels.length === 0) {
            setLoadingModels(true);
            fetchOpenRouterModels()
                .then(models => {
                    // Sort: Free first, then A-Z
                    const sorted = models.sort((a, b) => {
                        const isFreeA = (a.pricing?.prompt === "0" || a.pricing?.prompt === 0) &&
                            (a.pricing?.completion === "0" || a.pricing?.completion === 0);
                        const isFreeB = (b.pricing?.prompt === "0" || b.pricing?.prompt === 0) &&
                            (b.pricing?.completion === "0" || b.pricing?.completion === 0);

                        if (isFreeA && !isFreeB) return -1;
                        if (!isFreeA && isFreeB) return 1;
                        return a.name.localeCompare(b.name);
                    });
                    setAvailableModels(sorted);
                })
                .catch(err => console.error("Failed to fetch models", err))
                .finally(() => setLoadingModels(false));
        }
    }, [config.provider]);

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        // Reset test status on change
        if (testStatus !== 'idle') {
            setTestStatus('idle');
            setTestMessage('');
        }
    };

    const handleSave = () => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
        onConfigSave(config);
        onClose();
    };

    const handleClearCache = () => {
        if (window.confirm("Are you sure you want to clear your saved AI settings?")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setConfig({
                provider: 'gemini',
                apiKey: '',
                model: 'gemini-1.5-flash',
                baseUrl: 'https://openrouter.ai/api/v1',
                doclingFormat: 'markdown'
            });
            setTestStatus('idle');
            setTestMessage('');
        }
    };

    const handleTestConnection = async () => {
        if (!config.apiKey) {
            setTestStatus('error');
            setTestMessage("Please enter an API Key first.");
            return;
        }

        setTestStatus('testing');
        setTestMessage('Verifying connection...');

        try {
            await verifyApiConnection(config);
            setTestStatus('success');
            setTestMessage('Connection Successful!');
        } catch (error) {
            setTestStatus('error');
            setTestMessage(error.message);
        }
    };

    const isFreeModel = (m) => {
        return (m.pricing?.prompt === "0" || m.pricing?.prompt === 0) &&
            (m.pricing?.completion === "0" || m.pricing?.completion === 0);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'white', borderRadius: '8px',
                width: '90%', maxWidth: '500px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '15px 20px', borderBottom: '1px solid #e5e7eb',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>AI Configuration</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <IconXCircle size={24} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px' }}>
                    {/* Provider & Model */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Provider</label>
                            <select
                                value={config.provider}
                                onChange={(e) => handleChange('provider', e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            >
                                <option value="gemini">Google Gemini</option>
                                <option value="openrouter">OpenRouter</option>
                                <option value="ollama">Ollama (Local)</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Model</label>
                            {config.provider === 'openrouter' ? (
                                <select
                                    value={config.model}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    disabled={loadingModels}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="">Select a model...</option>
                                    {loadingModels && <option>Loading...</option>}
                                    {availableModels.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {isFreeModel(m) ? `[FREE] ${m.name}` : m.name}
                                        </option>
                                    ))}
                                    {!loadingModels && availableModels.length === 0 && <option value="google/gemini-flash-1.5">Default</option>}
                                </select>
                            ) : config.provider === 'ollama' ? (
                                <input
                                    type="text"
                                    value={config.model}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    placeholder="params: phi3, llama3, mistral"
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={config.model}
                                    onChange={(e) => handleChange('model', e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                />
                            )}
                        </div>
                    </div>

                    {/* API Key (Hidden for Ollama) */}
                    {config.provider !== 'ollama' && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>API Key</label>
                            <input
                                type="password"
                                value={config.apiKey}
                                onChange={(e) => handleChange('apiKey', e.target.value)}
                                placeholder="sk-..."
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            />
                        </div>
                    )}

                    {/* Base URL (OpenRouter & Ollama) */}
                    {(config.provider === 'openrouter' || config.provider === 'ollama') && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Base URL</label>
                            <input
                                type="text"
                                value={config.baseUrl}
                                onChange={(e) => handleChange('baseUrl', e.target.value)}
                                placeholder={config.provider === 'ollama' ? "http://localhost:11434" : "https://openrouter.ai/api/v1"}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            />
                            {config.provider === 'ollama' && (
                                <p style={{ fontSize: '11px', color: '#d97706', marginTop: '4px' }}>
                                    ⚠️ Ensure <code>OLLAMA_ORIGINS="*"</code> environment variable is set when running Ollama.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Custom Rules */}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px' }}>Custom AI Rules (Optional)</label>
                        <textarea
                            value={config.customRules || ''}
                            onChange={(e) => handleChange('customRules', e.target.value)}
                            placeholder="e.g., 'Ignore timestamp changes' or 'Flag port changes as Critical'"
                            rows={3}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', fontFamily: 'sans-serif' }}
                        />
                        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                            These instructions will be appended to the system prompt.
                        </p>
                    </div>

                    {/* Privacy Mode */}
                    <div style={{ marginBottom: '15px', padding: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#166534', marginBottom: '2px' }}>
                                    GDPR Privacy Mode
                                </label>
                                <p style={{ fontSize: '11px', color: '#166534', margin: 0 }}>
                                    Redact PII (Emails, Phones, IPs) before sending to AI.
                                </p>
                            </div>
                            <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                                <input
                                    type="checkbox"
                                    checked={config.enablePrivacy !== false}
                                    onChange={(e) => handleChange('enablePrivacy', e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: config.enablePrivacy !== false ? '#166534' : '#ccc',
                                    borderRadius: '20px', transition: '.4s'
                                }}></span>
                                <span style={{
                                    position: 'absolute', content: '""', height: '16px', width: '16px',
                                    left: config.enablePrivacy !== false ? '22px' : '2px', bottom: '2px',
                                    backgroundColor: 'white', borderRadius: '50%', transition: '.4s'
                                }}></span>
                            </label>
                        </div>
                    </div>

                    {/* Parsing Engine (Docling) */}
                    <div style={{ marginBottom: '15px', padding: '10px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#92400e', marginBottom: '2px' }}>
                                    Use Docling Backend
                                </label>
                                <p style={{ fontSize: '11px', color: '#92400e', margin: 0 }}>
                                    Use Python backend for enterprise-grade parsing (Tables/Layout).
                                </p>
                            </div>
                            <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                                <input
                                    type="checkbox"
                                    checked={config.useRemoteParser === true}
                                    onChange={(e) => handleChange('useRemoteParser', e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: config.useRemoteParser === true ? '#d97706' : '#ccc',
                                    borderRadius: '20px', transition: '.4s'
                                }}></span>
                                <span style={{
                                    position: 'absolute', content: '""', height: '16px', width: '16px',
                                    left: config.useRemoteParser === true ? '22px' : '2px', bottom: '2px',
                                    backgroundColor: 'white', borderRadius: '50%', transition: '.4s'
                                }}></span>
                            </label>
                        </div>
                        {config.useRemoteParser && (
                            <div style={{ marginTop: '8px' }}>
                                <input
                                    type="text"
                                    value={config.remoteUrl || 'http://localhost:8000/parse'}
                                    onChange={(e) => handleChange('remoteUrl', e.target.value)}
                                    placeholder="http://localhost:8000/parse"
                                    style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #d1d5db', marginBottom: '8px' }}
                                />

                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: '#92400e', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={config.enableFallback !== false}
                                        onChange={(e) => handleChange('enableFallback', e.target.checked)}
                                        style={{ marginRight: '6px' }}
                                    />
                                    Enable Fallback to Local Parser (if Backend fails)
                                </label>
                            </div>

                        )}

                        {config.useRemoteParser && (
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '5px', color: '#92400e' }}>
                                    Output Format
                                </label>
                                <select
                                    value={config.doclingFormat || 'markdown'}
                                    onChange={(e) => handleChange('doclingFormat', e.target.value)}
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
                                >
                                    <option value="markdown">Markdown (Recommended for AI)</option>
                                    <option value="json">JSON (Structured Block Tree)</option>
                                    <option value="html">HTML (Preserves Tables/Layout)</option>
                                    <option value="text">Plain Text (Simple)</option>
                                    <option value="doctags">DocTags (Tagged Format)</option>
                                    <option value="document_tokens">Document Tokens (Low Level)</option>
                                    <option value="xml">XML (Element Tree)</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Test Connection Result */}
                    {testStatus !== 'idle' && (
                        <div style={{
                            marginTop: '10px', padding: '10px', borderRadius: '4px', fontSize: '13px',
                            background: testStatus === 'success' ? '#f0fdf4' : testStatus === 'error' ? '#fef2f2' : '#eff6ff',
                            color: testStatus === 'success' ? '#166534' : testStatus === 'error' ? '#991b1b' : '#1e40af',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            {testStatus === 'success' && <IconCheckCircle size={16} />}
                            {testStatus === 'error' && <IconAlertTriangle size={16} />}
                            <span>{testMessage}</span>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '15px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb',
                    borderRadius: '0 0 8px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleClearCache}
                            title="Reset All AI Settings"
                            style={{
                                padding: '8px', background: 'white', border: '1px solid #d1d5db',
                                borderRadius: '4px', color: '#ef4444', cursor: 'pointer', display: 'flex',
                                marginRight: '5px'
                            }}
                        >
                            <IconTrash size={18} />
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm("Clear learned patterns? Use this if the AI learned a wrong decision.")) {
                                    clearMemory();
                                    alert("Memory cleared!");
                                }
                            }}
                            title="Clear Learned Patterns"
                            style={{
                                padding: '8px 12px', background: 'white', border: '1px solid #d1d5db',
                                borderRadius: '4px', color: '#6b7280', cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                            }}
                        >
                            Clear Memory
                        </button>
                        <button
                            onClick={handleTestConnection}
                            disabled={testStatus === 'testing'}
                            style={{
                                padding: '8px 12px', background: 'white', border: '1px solid #d1d5db',
                                borderRadius: '4px', color: '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: '500'
                            }}
                        >
                            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px 16px', background: 'white', border: '1px solid #d1d5db',
                                borderRadius: '4px', color: '#374151', cursor: 'pointer', fontSize: '14px'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            style={{
                                padding: '8px 16px', background: '#3b82f6', border: 'none',
                                borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
                            }}
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            </div >
        </div >
    );
}

export default SettingsModal;
