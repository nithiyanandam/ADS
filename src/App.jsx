import React, { useState, useMemo, useEffect } from 'react';
import PdfUpload from './components/PdfUpload';
import DirectoryUpload from './components/DirectoryUpload';
import BatchSummary from './components/BatchSummary';
import ComparisonSummary from './components/ComparisonSummary';
import DifferenceReview from './components/DifferenceReview';
import SettingsModal from './components/SettingsModal';

// Import Services
import { parsePdf } from './services/pdfParser'; // Real PDF.js Parser
import { normalizeDocument } from './services/normalizer';
import { compareDocuments } from './services/comparisonEngine';
import { analyzeDifference } from './services/aiAnalyzer'; // Mock
import { analyzeDiffWithLLM } from './services/llmService'; // Real / Generic
import { learnDifference, checkMemory } from './services/memoryStore';
import { processBatch } from './services/batchProcessor';
import { retrieveRelevantRules } from './services/advisoryService';

function App() {
  const [currentView, setCurrentView] = useState('upload'); // 'upload', 'summary', 'review'
  const [comparisonResults, setComparisonResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Phase 3: Batch Mode State
  const [mode, setMode] = useState('single'); // 'single' | 'batch'
  const [batchQueue, setBatchQueue] = useState([]);
  const [currentMetadata, setCurrentMetadata] = useState(null); // { title, subtitle }

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-1.5-flash',
    baseUrl: 'https://openrouter.ai/api/v1',
    customRules: ''
  });

  // Load config from cache on mount
  useEffect(() => {
    const cached = localStorage.getItem('docdiff_ai_config_v1');
    if (cached) {
      try {
        setAiConfig(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to load config", e);
      }
    }
  }, []);

  const handleConfigSave = (newConfig) => {
    setAiConfig(newConfig);
  };

  const handleUploadComplete = async ({ oldFile, newFile }) => {
    setLoading(true);
    try {
      // 1. Parse
      const oldJson = await parsePdf(oldFile, aiConfig);
      const newJson = await parsePdf(newFile, aiConfig);

      // 2. Normalize
      const oldNorm = normalizeDocument(oldJson);
      const newNorm = normalizeDocument(newJson);

      // 3. Compare
      const diffs = compareDocuments(oldNorm, newNorm);

      // import { retrieveRelevantRules } from './services/advisoryService'; // Make sure to add this import at top!

      // 4. AI Analysis & Memory Check (Sequential to avoid 429)
      const analyzedDiffs = [];
      for (const diff of diffs) {
        // First check memory
        const memoryResult = checkMemory(diff);
        if (memoryResult) {
          analyzedDiffs.push({ ...diff, aiAnalysis: memoryResult, reviewerDecision: null });
          continue;
        }

        // If no memory, use AI (Real or Mock)
        let analysis;
        if (aiConfig.apiKey) {
          // [RAG] Retrieve Rules
          const queryText = `${diff.fieldLabel || ''} ${diff.oldValue || ''} ${diff.newValue || ''} ${diff.changeType}`.trim().substring(0, 200);
          let ragRules = [];
          try {
            ragRules = await retrieveRelevantRules(queryText);
          } catch (ragErr) {
            console.warn("RAG retrieval failed (ignoring):", ragErr);
          }

          // Real AI
          analysis = await analyzeDiffWithLLM(diff, aiConfig, ragRules);
        } else {
          // Mock AI
          analysis = analyzeDifference(diff);
        }

        analyzedDiffs.push({ ...diff, aiAnalysis: analysis, reviewerDecision: null });
      }

      setComparisonResults(analyzedDiffs);
      setCurrentMetadata({
        title: 'Single File Comparison',
        subtitle: `${oldFile.name} vs ${newFile.name}`
      });
      setCurrentView('summary');
    } catch (error) {
      console.error("Comparison failed:", error);
      alert("An error occurred during comparison.");
    } finally {
      setLoading(false);
    }
  };

  // Phase 3: Batch Results
  const [batchResults, setBatchResults] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, file: '' });

  const handleBatchStart = async (pairs) => {
    console.log("Starting batch with pairs:", pairs);
    setBatchQueue(pairs);
    setLoading(true);

    try {
      const results = await processBatch(pairs, aiConfig, (curr, total, file) => {
        setProgress({ current: curr, total, file });
      });

      setBatchResults(results);
      // Auto-switch to a Batch Summary View (reusing 'summary' view for now, effectively "Dashboard")
      setCurrentView('batchSummary');
    } catch (err) {
      console.error("Batch processing failed", err);
      alert("Batch processing stopped due to error.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewClick = () => setCurrentView('review');
  const handleBackToSummary = () => setCurrentView('summary');
  const handleReviewDecision = (diffId, decision) => {
    const targetDiff = comparisonResults.find(r => r.id === diffId);
    if (decision === 'Accepted' && targetDiff) {
      learnDifference(targetDiff);
    }
    setComparisonResults(prevResults =>
      prevResults.map(r => r.id === diffId ? { ...r, reviewerDecision: decision } : r)
    );
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(comparisonResults, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "comparison_report.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summaryStats = useMemo(() => {
    const stats = { expected: 0, uncertain: 0, defects: 0 };
    comparisonResults.forEach(r => {
      const decision = r.aiAnalysis.decision;
      if (decision === 'Expected') stats.expected++;
      else if (decision === 'Uncertain') stats.uncertain++;
      else stats.defects++;
    });
    return stats;
  }, [comparisonResults]);

  return (
    <div className="app-card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1>AI-Powered Docdiff</h1>
          <span style={{
            fontSize: '11px',
            background: aiConfig.apiKey ? '#dcfce7' : '#f3f4f6',
            color: aiConfig.apiKey ? '#166534' : '#6b7280',
            padding: '2px 8px',
            borderRadius: '10px',
            border: '1px solid ' + (aiConfig.apiKey ? '#bbf7d0' : '#e5e7eb')
          }}>
            {aiConfig.apiKey ? `Real AI (${aiConfig.provider})` : 'Mock AI Mode'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Mode Toggle */}
          <div style={{ background: '#e5e7eb', borderRadius: '20px', padding: '4px', display: 'flex', marginRight: '10px' }}>
            <button
              onClick={() => { setMode('single'); setCurrentView('upload'); }}
              style={{
                padding: '4px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                background: mode === 'single' ? 'white' : 'transparent',
                color: mode === 'single' ? '#374151' : '#6b7280',
                boxShadow: mode === 'single' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Single File
            </button>
            <button
              onClick={() => { setMode('batch'); setCurrentView('upload'); }}
              style={{
                padding: '4px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                background: mode === 'batch' ? 'white' : 'transparent',
                color: mode === 'batch' ? '#374151' : '#6b7280',
                boxShadow: mode === 'batch' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Directory
            </button>
          </div>

          <button
            className="logout-btn"
            onClick={() => setIsSettingsOpen(true)}
            style={{ cursor: 'pointer' }}
          >
            Settings
          </button>
          <button className="logout-btn">Logout</button>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSave={handleConfigSave}
      />

      <div className="card-body">
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            {mode === 'batch' ? (
              <div>
                <p style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>Batch Processing...</p>
                <p>File {progress.current + 1} of {progress.total}</p>
                <p style={{ fontStyle: 'italic', color: '#9ca3af' }}>{progress.file}</p>
                <div style={{ width: '200px', height: '6px', background: '#e5e7eb', margin: '15px auto', borderRadius: '3px' }}>
                  <div style={{
                    width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
                    height: '100%',
                    background: '#2563eb',
                    borderRadius: '3px',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            ) : (
              <p>Processing documents...</p>
            )}
          </div>
        )}

        {!loading && currentView === 'upload' && (
          <>
            {mode === 'single' ? (
              <PdfUpload onUploadComplete={handleUploadComplete} />
            ) : (
              <DirectoryUpload onBatchStart={handleBatchStart} aiConfig={aiConfig} />
            )}
          </>
        )}

        {/* Batch Summary View */}
        {!loading && currentView === 'batchSummary' && (
          <BatchSummary
            results={batchResults}
            onBack={() => { setCurrentView('upload'); setBatchQueue([]); setBatchResults([]); }}
            onViewDetails={(result) => {
              setComparisonResults(result.diffs);
              setCurrentMetadata({
                title: 'File Detail Review',
                subtitle: `File: ${result.fileId}`
              });
              setCurrentView('review');
            }}
            onExport={() => {
              const dataStr = JSON.stringify(batchResults, null, 2);
              const blob = new Blob([dataStr], { type: "application/json" });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = "batch_report.json";
              link.click();
            }}
          />
        )}

        {!loading && currentView === 'summary' && (
          <ComparisonSummary
            summaryData={summaryStats}
            metadata={currentMetadata}
            onReviewClick={handleReviewClick}
            onExport={handleExport}
          />
        )}

        {!loading && currentView === 'review' && (
          <DifferenceReview
            differences={comparisonResults}
            onBack={() => {
              if (mode === 'batch') setCurrentView('batchSummary');
              else handleBackToSummary();
            }}
            onReviewDecision={handleReviewDecision}
            aiConfig={aiConfig}
          />
        )}
      </div>
    </div>
  );
}

export default App;
