'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PipelineOverlay, AgentStep } from '../components/PipelineOverlay';
import { SkeletonReviewForm } from '../components/SkeletonReviewForm';
import { PRDSkeletonSection } from '@/agent/agents/prd/types';
import styles from '../prd.module.css';

export function PipelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');

  const [step, setStep] = useState<AgentStep>('analyst');
  const [runId, setRunId] = useState<string | null>(null);
  const [skeleton, setSkeleton] = useState<PRDSkeletonSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!documentId) {
      setError('No document selected. Please go back and select an MRD Producer document.');
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    startPipeline(documentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  /** Consume a streaming NDJSON response, calling onEvent for each parsed line. */
  async function consumeStream(
    res: Response,
    onEvent: (event: Record<string, unknown>) => void,
    terminalEvents: string[]
  ): Promise<boolean> {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response stream');

    const decoder = new TextDecoder();
    let buffer = '';
    let receivedFinal = false;

    function processBuffer() {
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (terminalEvents.includes(event.type)) receivedFinal = true;
          onEvent(event);
        } catch { /* ignore malformed lines */ }
      }
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Flush decoder and process any remaining buffered data
        buffer += decoder.decode();
        if (buffer.trim()) processBuffer();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      processBuffer();
    }
    return receivedFinal;
  }

  async function startPipeline(docId: string) {
    try {
      // ── Phase 1: Analyst + Architect (closes at human_gate) ──────────────
      const res = await fetch('/api/pipeline/prd/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      });

      const rid = res.headers.get('X-Run-Id');
      if (rid) setRunId(rid);

      const gotGate = await consumeStream(res, handlePhase1Event, ['human_gate', 'error']);
      if (!gotGate) {
        setError('Phase 1 ended unexpectedly. Please try again.');
      }
      // human_gate handler sets step → 'human_gate'; user then approves via handleApprove
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline failed');
    }
  }

  async function resumePipeline(rid: string) {
    try {
      // ── Phase 2: Writer + QA (triggered after approval) ──────────────────
      const res = await fetch(`/api/pipeline/prd/${rid}/resume`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Resume failed (${res.status})`);
        return;
      }

      const gotDone = await consumeStream(res, handlePhase2Event, ['pipeline_done', 'error']);
      if (!gotDone) {
        setError('The pipeline connection was interrupted. The AI may still be running — please check back in a minute or try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline phase 2 failed');
    }
  }

  function handlePhase1Event(event: Record<string, unknown>) {
    const type = event.type as string;
    if (type === 'agent_start') {
      setStep(event.agent as AgentStep);
    } else if (type === 'human_gate') {
      setRunId(event.run_id as string);
      setSkeleton(event.skeleton as PRDSkeletonSection[]);
      setStep('human_gate');
    } else if (type === 'error') {
      setError(event.message as string);
    }
  }

  function handlePhase2Event(event: Record<string, unknown>) {
    const type = event.type as string;
    if (type === 'agent_start') {
      setStep(event.agent as AgentStep);
    } else if (type === 'pipeline_done') {
      router.push(`/prd/${event.prd_document_id}`);
    } else if (type === 'error') {
      setError(event.message as string);
    }
  }

  async function handleApprove(editedSkeleton: PRDSkeletonSection[]) {
    if (!runId) return;
    try {
      // Save approved skeleton to DB
      const res = await fetch(`/api/pipeline/prd/${runId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skeleton: editedSkeleton }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Approval failed (${res.status})`);
        return;
      }
      // Open Phase 2 stream
      setStep('writer');
      await resumePipeline(runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={() => router.push('/prd')}>Back to picker</button>
      </div>
    );
  }

  if (step === 'human_gate') {
    return (
      <div className={styles.page}>
        <div className={styles.pipelineContainer}>
          <h2 className={styles.title}>Review PRD Skeleton</h2>
          <p className={styles.subtitle}>Edit the writing strategy for any section, then approve to continue.</p>
          <SkeletonReviewForm skeleton={skeleton} onApprove={handleApprove} />
        </div>
      </div>
    );
  }

  return <PipelineOverlay currentStep={step} />;
}
