'use client';

/**
 * Test Page for SmartTextBox and FieldStatusBadge Components
 *
 * This page demonstrates all component features:
 * - Auto-expanding textarea
 * - Pause detection (2.5s debounce)
 * - AI processing animation
 * - Complete state
 * - Character counter
 * - Field status badge
 *
 * To test: Create a temporary route at /brief-helper/test and use this as page.tsx
 */

import React, { useState } from 'react';
import SmartTextBox from './SmartTextBox';
import FieldStatusBadge from './FieldStatusBadge';
import { BriefField } from '../lib/brief-state';

export default function TestPage() {
  const [value, setValue] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [pauseCount, setPauseCount] = useState(0);

  const handlePause = () => {
    console.log('User paused typing!');
    setPauseCount((prev) => prev + 1);

    // Simulate AI processing for 2 seconds
    setIsAIProcessing(true);
    setTimeout(() => {
      setIsAIProcessing(false);
      // Auto-mark complete after processing
      if (value.length > 20) {
        setIsComplete(true);
      }
    }, 2000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1>SmartTextBox & FieldStatusBadge Test</h1>

      <div style={{ marginTop: '32px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>What is it?</h2>
          <FieldStatusBadge currentField={1} totalFields={6} isComplete={isComplete} />
        </div>

        <SmartTextBox
          fieldType={'what' as BriefField}
          value={value}
          onChange={setValue}
          onPause={handlePause}
          isAIProcessing={isAIProcessing}
          isComplete={isComplete}
          placeholder="Describe your product... (type at least 20 characters and pause for 2.5 seconds to trigger AI processing)"
          aria-label="What is the product?"
        />

        <div style={{ marginTop: '24px', fontSize: '14px', color: '#666' }}>
          <p>
            <strong>Test Instructions:</strong>
          </p>
          <ul>
            <li>Type some text and pause for 2.5 seconds to trigger onPause</li>
            <li>Watch the textarea auto-expand as you add content</li>
            <li>AI processing animation will show for 2 seconds after pause</li>
            <li>Character counter appears in bottom-right corner</li>
            <li>Field badge turns green when complete (after typing 20+ chars)</li>
            <li>Min height: 120px, Max height: 400px</li>
          </ul>

          <p>
            <strong>Status:</strong>
          </p>
          <ul>
            <li>Pause count: {pauseCount}</li>
            <li>AI Processing: {isAIProcessing ? 'Yes (pulsing)' : 'No'}</li>
            <li>Complete: {isComplete ? 'Yes (green border)' : 'No'}</li>
            <li>Character count: {value.length}</li>
          </ul>

          <button
            onClick={() => {
              setValue('');
              setIsComplete(false);
              setPauseCount(0);
            }}
            style={{
              padding: '8px 16px',
              marginTop: '8px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
