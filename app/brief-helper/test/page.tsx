'use client';

/**
 * Component Test Page
 *
 * Tests SmartTextBox and FieldStatusBadge components with all features:
 * - Auto-expanding textarea (min 120px, max 400px)
 * - Pause detection (2.5s debounce)
 * - AI processing animation
 * - Complete state visual feedback
 * - Character counter
 * - Field status badge states
 */

import React, { useState } from 'react';
import SmartTextBox from '../components/SmartTextBox';
import FieldStatusBadge from '../components/FieldStatusBadge';
import { BriefField } from '../lib/brief-state';

export default function TestPage() {
  const [value, setValue] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  const handlePause = () => {
    addLog('User paused typing - triggering AI processing');
    setPauseCount((prev) => prev + 1);

    // Simulate AI processing for 2 seconds
    setIsAIProcessing(true);
    setTimeout(() => {
      setIsAIProcessing(false);
      addLog('AI processing complete');

      // Auto-mark complete after processing if enough content
      if (value.length > 20) {
        setIsComplete(true);
        addLog('Field marked complete (20+ characters)');
      }
    }, 2000);
  };

  const handleReset = () => {
    setValue('');
    setIsComplete(false);
    setIsAIProcessing(false);
    setPauseCount(0);
    setLog([]);
    addLog('Reset all fields');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '8px' }}>SmartTextBox Component Test</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Testing auto-expand, pause detection, AI processing animation, and status badge
        </p>
      </div>

      {/* Test Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>What is it?</h2>
          <FieldStatusBadge currentField={1} totalFields={6} isComplete={isComplete} />
        </div>

        <SmartTextBox
          fieldType={'what' as BriefField}
          value={value}
          onChange={(newValue) => {
            setValue(newValue);
            if (newValue.length > 0) {
              addLog(`Text changed (${newValue.length} chars)`);
            }
          }}
          onPause={handlePause}
          isAIProcessing={isAIProcessing}
          isComplete={isComplete}
          placeholder="Type some text and pause for 2.5 seconds to trigger AI processing animation..."
          aria-label="What is the product?"
        />
      </div>

      {/* Status Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Character Count
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{value.length}</div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Pause Count
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{pauseCount}</div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            AI Processing
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {isAIProcessing ? '🔄 Yes' : '✓ No'}
          </div>
        </div>

        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Complete Status
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {isComplete ? '✓ Complete' : '○ Incomplete'}
          </div>
        </div>
      </div>

      {/* Test Instructions */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Test Instructions</h3>
        <ul style={{ lineHeight: 1.8, color: 'var(--text-secondary)' }}>
          <li>
            <strong>Auto-expand:</strong> Type multiple lines to see textarea expand (min 120px, max
            400px)
          </li>
          <li>
            <strong>Pause detection:</strong> Stop typing for 2.5 seconds to trigger onPause callback
          </li>
          <li>
            <strong>AI processing:</strong> Watch for pulsing animation after pause (lasts 2 seconds)
          </li>
          <li>
            <strong>Character counter:</strong> Appears in bottom-right when text is present
          </li>
          <li>
            <strong>Complete state:</strong> Green border appears after 20+ characters (post-AI
            processing)
          </li>
          <li>
            <strong>Status badge:</strong> Green background when complete, gray when incomplete
          </li>
          <li>
            <strong>Reduced motion:</strong> Animations respect prefers-reduced-motion setting
          </li>
        </ul>
      </div>

      {/* Activity Log */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Activity Log</h3>
          <button
            onClick={handleReset}
            style={{
              padding: '6px 12px',
              fontSize: '0.875rem',
            }}
          >
            Reset
          </button>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'var(--background)',
            padding: '12px',
            borderRadius: 'var(--radius)',
          }}
        >
          {log.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No activity yet...</div>
          ) : (
            log.map((entry, i) => <div key={i}>{entry}</div>)
          )}
        </div>
      </div>

      {/* Badge States Demo */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Badge States Demo</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {[1, 2, 3, 4, 5, 6].map((field) => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <FieldStatusBadge
                currentField={field}
                totalFields={6}
                isComplete={field <= 3}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                {field <= 3 ? 'Complete' : 'Incomplete'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
