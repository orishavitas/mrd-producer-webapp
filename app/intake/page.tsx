'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './intake.module.css';

import { IntakeProvider, useIntake } from './lib/intake-context';
import { getTopicDefinition } from './lib/topic-definitions';
import type { TopicData, TopicStatus } from './lib/intake-state';

import KickstartPanel from './components/kickstart-panel';
import TopicCard from './components/topic-card';
import TopicFieldRenderer from './components/topic-field-renderer';
import ProgressSidebar from './components/progress-sidebar';
import MobileProgress from './components/mobile-progress';
import GapPanel from './components/gap-panel';
import ResearchBrief from './components/research-brief';

export default function IntakePage() {
  return (
    <IntakeProvider>
      <IntakeFlow />
    </IntakeProvider>
  );
}

// --- Main flow orchestrator ---

function IntakeFlow() {
  const { state } = useIntake();

  switch (state.phase) {
    case 'kickstart':
      return <KickstartPhase />;
    case 'topics':
      return <TopicsPhase />;
    case 'review':
      return <ReviewPhase />;
    case 'gaps':
      return <GapsPhase />;
    case 'generating':
      return <GeneratingPhase />;
    case 'results':
      return <ResultsRedirect />;
    default:
      return <KickstartPhase />;
  }
}

// --- Phase: Kickstart ---

function KickstartPhase() {
  const { state, dispatch } = useIntake();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDescribe(text: string) {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch('/api/intake/parse-kickstart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to parse description');
      }

      const result = await response.json();

      // Update all topics with parsed data — all start as upcoming, topic[0] is active
      const updatedTopics = state.topics.map((topic, i) => {
        const parsed = result.topics?.[topic.id];
        return {
          ...topic,
          structuredData: parsed?.structuredData || {},
          freetext: parsed?.freetext || {},
          completeness: parsed?.completeness || 0,
          status: i === 0 ? 'active' as TopicStatus : 'upcoming' as TopicStatus,
        };
      });
      dispatch({ type: 'SET_ALL_TOPICS', topics: updatedTopics });
      dispatch({ type: 'SET_ACTIVE_TOPIC', topicIndex: 0 });
      dispatch({ type: 'SET_PHASE', phase: 'topics' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleStartFromScratch() {
    // Set first topic as active and go to topics phase
    dispatch({
      type: 'UPDATE_TOPIC',
      topicId: state.topics[0].id,
      data: { status: 'active' },
    });
    dispatch({ type: 'SET_ACTIVE_TOPIC', topicIndex: 0 });
    dispatch({ type: 'SET_PHASE', phase: 'topics' });
  }

  return (
    <div className={styles.wrapper}>
      <main className={styles.mainCentered}>
        <div className={styles.phaseHeader}>
          <h2 className={styles.phaseTitle}>Start Your MRD</h2>
          <p className={styles.phaseDescription}>
            Choose how you would like to begin building your Market Requirements Document.
          </p>
        </div>
        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}
        <KickstartPanel
          onDescribe={handleDescribe}
          onStartFromScratch={handleStartFromScratch}
          isProcessing={isProcessing}
        />
      </main>
    </div>
  );
}

// --- Phase: Topics ---

function TopicsPhase() {
  const { state, dispatch, updateTopicField } = useIntake();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTopic = state.topics[state.activeTopicIndex] ?? null;

  const topicProgressData = state.topics.map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    completeness: t.completeness,
  }));

  // Get the field value for the active topic
  const getFieldValue = useCallback(
    (topicId: string, fieldId: string): string | string[] => {
      const topic = state.topics.find((t) => t.id === topicId);
      if (!topic) return '';
      const topicDef = getTopicDefinition(topicId);
      if (!topicDef) return '';
      const field = topicDef.fields.find((f) => f.id === fieldId);
      if (!field) return '';

      if (field.type === 'freetext') {
        return topic.freetext[fieldId] || '';
      }
      return topic.structuredData[fieldId] || (
        field.type === 'chips' || field.type === 'multi-select' ? [] : ''
      );
    },
    [state.topics]
  );

  // Build a summary string for a completed topic
  function buildTopicSummary(topic: TopicData): string {
    const parts: string[] = [];
    for (const [, value] of Object.entries(topic.structuredData)) {
      if (!value) continue;
      const display = Array.isArray(value) ? value.join(', ') : value;
      if (display.trim()) parts.push(display);
    }
    for (const [, value] of Object.entries(topic.freetext)) {
      if (value && value.trim()) parts.push(value.trim());
    }
    return parts.join(' | ').slice(0, 200) || 'Completed';
  }

  async function handleApproveTopic(topicId: string) {
    const topic = state.topics.find((t) => t.id === topicId);
    if (!topic) return;
    const currentIndex = state.topics.findIndex((t) => t.id === topicId);

    setIsEvaluating(true);
    setError(null);

    // 1. Evaluate (non-blocking on failure — use fallback score 50)
    let score = 50;
    try {
      const allTopicsState = state.topics.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        completeness: t.completeness,
      }));

      const response = await fetch('/api/intake/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          structuredData: topic.structuredData,
          freetext: topic.freetext,
          allTopicsState,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        score = result.topicScore || 50;
      }
    } catch {
      // Evaluation failed — proceed with fallback score
    }

    // 2. Approve: mark done, activate next (or go to review)
    dispatch({ type: 'APPROVE_TOPIC', topicIndex: currentIndex, score });

    const isLast = currentIndex === state.topics.length - 1;

    // 3. If not last topic, pre-fill subsequent topics via AI
    if (!isLast) {
      dispatch({ type: 'SET_UPDATING_TOPICS', isUpdating: true });
      try {
        // Build approved topics data
        const approvedTopics: Record<string, { structuredData: Record<string, string | string[]>; freetext: Record<string, string> }> = {};
        for (let i = 0; i <= currentIndex; i++) {
          const t = state.topics[i];
          approvedTopics[t.id] = {
            structuredData: i === currentIndex ? topic.structuredData : t.structuredData,
            freetext: i === currentIndex ? topic.freetext : t.freetext,
          };
        }
        const remainingTopicIds = state.topics.slice(currentIndex + 1).map((t) => t.id);

        const response = await fetch('/api/intake/update-subsequent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvedTopics, remainingTopicIds }),
        });

        if (response.ok) {
          const result = await response.json();
          const updates = result.topicUpdates;
          if (updates) {
            for (const [tid, data] of Object.entries(updates) as [string, { structuredData: Record<string, string | string[]>; freetext: Record<string, string>; completeness: number }][]) {
              dispatch({
                type: 'UPDATE_TOPIC',
                topicId: tid,
                data: {
                  structuredData: data.structuredData || {},
                  freetext: data.freetext || {},
                  completeness: data.completeness || 0,
                },
              });
            }
          }
        }
      } catch {
        // Pre-fill failed — user fills manually, no error shown
      } finally {
        dispatch({ type: 'SET_UPDATING_TOPICS', isUpdating: false });
      }
    }

    setIsEvaluating(false);
  }

  function handleTopicClick(topicId: string) {
    const topic = state.topics.find((t) => t.id === topicId);
    if (!topic || topic.status !== 'completed') return;
    if (state.isUpdatingTopics) return;

    // If topics after the clicked one are completed, confirm rollback
    const clickedIndex = state.topics.findIndex((t) => t.id === topicId);
    const hasCompletedAfter = state.topics.some(
      (t, i) => i > clickedIndex && t.status === 'completed'
    );
    if (hasCompletedAfter) {
      const ok = confirm('Rolling back will clear all topics after this one. Continue?');
      if (!ok) return;
    }

    dispatch({ type: 'ROLLBACK_TO_TOPIC', topicIndex: clickedIndex });
  }

  function handleGenerate() {
    dispatch({ type: 'SET_PHASE', phase: 'review' });
  }

  function handleSkipToGenerate() {
    dispatch({ type: 'SET_PHASE', phase: 'gaps' });
  }

  return (
    <div className={styles.wrapper}>
      {/* Desktop sidebar */}
      <ProgressSidebar
        topics={topicProgressData}
        overallReadiness={state.overallReadiness}
        onTopicClick={state.isUpdatingTopics ? undefined : handleTopicClick}
        onGenerate={handleGenerate}
        onSkipToGenerate={handleSkipToGenerate}
      />

      {/* Mobile progress */}
      <div className={styles.mobileProgressWrapper}>
        <MobileProgress
          topics={topicProgressData}
          overallReadiness={state.overallReadiness}
        />
      </div>

      {/* Main content */}
      <main className={styles.main}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        {isEvaluating && (
          <div className={styles.evaluatingBanner}>
            <span className={styles.spinnerInline} aria-hidden="true" />
            Evaluating...
          </div>
        )}

        {state.isUpdatingTopics && (
          <div className={styles.evaluatingBanner}>
            <span className={styles.spinnerInline} aria-hidden="true" />
            Updating topics...
          </div>
        )}

        <div className={styles.topicStack}>
          {state.topics.map((topic) => {
            const definition = getTopicDefinition(topic.id);
            if (!definition) return null;

            const isActive = topic.id === activeTopic?.id;
            const isEditable = isActive && !state.isUpdatingTopics;
            const isCompleted = topic.status === 'completed';
            return (
              <TopicCard
                key={topic.id}
                title={definition.name}
                description={definition.description}
                topicId={topic.id}
                status={topic.status}
                completeness={topic.completeness}
                summary={isCompleted ? buildTopicSummary(topic) : undefined}
                submitLabel="Approve & Continue"
                onSubmit={isEditable ? () => handleApproveTopic(topic.id) : undefined}
                onExpand={isCompleted ? () => handleTopicClick(topic.id) : undefined}
              >
                {isEditable &&
                  definition.fields.map((field) => (
                    <TopicFieldRenderer
                      key={field.id}
                      field={field}
                      value={getFieldValue(topic.id, field.id)}
                      onChange={(value) => updateTopicField(topic.id, field.id, value)}
                    />
                  ))}
              </TopicCard>
            );
          })}
        </div>
      </main>
    </div>
  );
}

// --- Phase: Review ---

function ReviewPhase() {
  const { state, dispatch } = useIntake();
  const [isLoading, setIsLoading] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate brief on mount if not already available
  useEffect(() => {
    if (!state.researchBrief) {
      generateBrief();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function buildAllTopicsData(): Record<
    string,
    { structuredData: Record<string, string | string[]>; freetext: Record<string, string> }
  > {
    const result: Record<
      string,
      { structuredData: Record<string, string | string[]>; freetext: Record<string, string> }
    > = {};
    for (const topic of state.topics) {
      result[topic.id] = {
        structuredData: topic.structuredData,
        freetext: topic.freetext,
      };
    }
    return result;
  }

  async function generateBrief() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/intake/generate-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allTopicsData: buildAllTopicsData() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate brief');
      }

      const result = await response.json();
      dispatch({ type: 'SET_BRIEF', brief: result.brief });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevision(revision: string) {
    if (!state.researchBrief) return;
    setIsRevising(true);
    setError(null);
    try {
      const response = await fetch('/api/intake/revise-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentBrief: state.researchBrief,
          revision,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to revise brief');
      }

      const result = await response.json();
      dispatch({ type: 'SET_BRIEF', brief: result.brief });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsRevising(false);
    }
  }

  async function handleCheckGaps() {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/intake/analyze-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allTopicsData: buildAllTopicsData(),
          brief: state.researchBrief || '',
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to analyze gaps');
      }

      const result = await response.json();
      dispatch({ type: 'SET_GAPS', gaps: result.gaps || [] });
      dispatch({ type: 'SET_PHASE', phase: 'gaps' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleGoBack() {
    // Rollback to last topic instead of just changing phase
    const lastIndex = state.topics.length - 1;
    dispatch({ type: 'ROLLBACK_TO_TOPIC', topicIndex: lastIndex });
  }

  return (
    <div className={styles.wrapper}>
      <main className={styles.mainCentered}>
        <div className={styles.phaseHeader}>
          <h2 className={styles.phaseTitle}>Review Research Brief</h2>
          <p className={styles.phaseDescription}>
            Review the AI-generated research brief based on your intake data. Request changes or proceed to gap analysis.
          </p>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} aria-hidden="true" />
            <p className={styles.loadingText}>Generating research brief...</p>
          </div>
        ) : state.researchBrief ? (
          <>
            <ResearchBrief
              briefContent={state.researchBrief}
              onRevisionRequest={handleRevision}
              isRevising={isRevising}
            />

            <div className={styles.reviewActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleGoBack}
              >
                Go back
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleCheckGaps}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <span className={styles.spinnerButtonWrapper}>
                    <span className={styles.spinnerSmall} aria-hidden="true" />
                    Analyzing...
                  </span>
                ) : (
                  'Check for gaps'
                )}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.loadingContainer}>
            <p className={styles.loadingText}>No brief available. Try going back and filling in some topics first.</p>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleGoBack}
            >
              Go back
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Phase: Gaps ---

function GapsPhase() {
  const { state, dispatch, rollbackToTopic } = useIntake();

  const gapData = state.gaps.map((g) => ({
    severity: (g.severity === 'green' ? 'yellow' : g.severity) as 'red' | 'yellow',
    topicId: g.topicId,
    title: g.title,
    explanation: g.explanation,
    canAIFill: g.canAIFill,
  }));

  function handleFillGap(topicId: string) {
    rollbackToTopic(topicId);
  }

  function handleAcceptGap(gapTitle: string) {
    dispatch({ type: 'DISMISS_GAP', gapTitle });
  }

  function handleGoBack() {
    dispatch({ type: 'SET_PHASE', phase: 'review' });
  }

  function handleGenerateAnyway() {
    dispatch({ type: 'SET_PHASE', phase: 'generating' });
  }

  return (
    <div className={styles.wrapper}>
      <main className={styles.mainCentered}>
        <GapPanel
          gaps={gapData}
          overallReadiness={state.overallReadiness}
          onFillGap={handleFillGap}
          onAcceptGap={handleAcceptGap}
          onGoBack={handleGoBack}
          onGenerateAnyway={handleGenerateAnyway}
        />
      </main>
    </div>
  );
}

// --- Phase: Generating ---

function GeneratingPhase() {
  const { state, dispatch } = useIntake();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateMRD();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function generateMRD() {
    setError(null);
    try {
      // Build the intake data payload
      const intakeData: Record<
        string,
        { structuredData: Record<string, string | string[]>; freetext: Record<string, string> }
      > = {};
      for (const topic of state.topics) {
        intakeData[topic.id] = {
          structuredData: topic.structuredData,
          freetext: topic.freetext,
        };
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeData,
          brief: state.researchBrief || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate MRD');
      }

      const result = await response.json();

      // Persist result to sessionStorage so the /intake/results page can read it
      // (results page is a sibling route without access to IntakeProvider context)
      try {
        sessionStorage.setItem(
          'mrd-result',
          JSON.stringify({
            mrd: result.mrd,
            sources: result.sources || [],
            productName: (state.topics
              .find((t) => t.id === 'problem-vision')
              ?.freetext?.visionStatement as string) ||
              (state.topics
              .find((t) => t.id === 'product-definition')
              ?.freetext?.productDescription as string) || 'MRD',
          })
        );
      } catch {
        // sessionStorage may be unavailable; results page will handle gracefully
      }

      dispatch({
        type: 'SET_RESULT',
        mrd: result.mrd,
        sources: result.sources || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className={styles.wrapper}>
      <main className={styles.mainCentered}>
        {error ? (
          <div className={styles.generatingContainer}>
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
            <div className={styles.reviewActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'gaps' })}
              >
                Go back
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setError(null);
                  generateMRD();
                }}
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.generatingContainer}>
            <div className={styles.generatingAnimation}>
              <div className={styles.generatingPulse} />
              <div className={styles.generatingPulse} />
              <div className={styles.generatingPulse} />
            </div>
            <h2 className={styles.generatingTitle}>Generating Your MRD</h2>
            <p className={styles.generatingText}>
              Conducting web research and building your Market Requirements Document.
              This may take a minute or two...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Phase: Results (redirect) ---

function ResultsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push('/intake/results');
  }, [router]);

  return (
    <div className={styles.wrapper}>
      <main className={styles.mainCentered}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} aria-hidden="true" />
          <p className={styles.loadingText}>Redirecting to results...</p>
        </div>
      </main>
    </div>
  );
}
