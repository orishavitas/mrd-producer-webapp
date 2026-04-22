'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PipelineOverlay, AgentStep } from '../components/PipelineOverlay';
import { SkeletonReviewForm } from '../components/SkeletonReviewForm';
import { PRDSkeletonSection } from '@/agent/agents/prd/types';
import styles from '../prd.module.css';

export default function PipelinePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = searchParams.get('documentId');

  const [step, setStep] = useState<AgentStep>('analyst');
  const [runId, setRunId] = useState<string | null>(null);
  const [skeleton, setSkeleton] = useState<PRDSkeletonSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!documentId || startedRef.current) return;
    startedRef.current = true;
    startPipeline(documentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  async function startPipeline(docId: string) {
    try {
      const res = await fetch('/api/pipeline/prd/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      });

      const rid = res.headers.get('X-Run-Id');
      if (rid) setRunId(rid);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            handleEvent(event);
          } catch { /* ignore malformed lines */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline failed');
    }
  }

  function handleEvent(event: Record<string, unknown>) {
    const type = event.type as string;
    if (type === 'agent_start') {
      setStep(event.agent as AgentStep);
    } else if (type === 'human_gate') {
      setRunId(event.run_id as string);
      setSkeleton(event.skeleton as PRDSkeletonSection[]);
      setStep('human_gate');
    } else if (type === 'pipeline_done') {
      router.push(`/prd/${event.prd_document_id}`);
    } else if (type === 'error') {
      setError(event.message as string);
    }
  }

  async function handleApprove(editedSkeleton: PRDSkeletonSection[]) {
    if (!runId) return;
    await fetch(`/api/pipeline/prd/${runId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skeleton: editedSkeleton }),
    });
    setStep('writer');
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
