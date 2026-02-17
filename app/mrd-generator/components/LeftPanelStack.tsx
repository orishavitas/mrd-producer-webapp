'use client';

import ChatInterface from './ChatInterface';
import ProgressSidebar from './ProgressSidebar';
import { useMRD } from '../lib/mrd-context';
import type { MRDSection } from '../lib/mrd-state';
import styles from './LeftPanelStack.module.css';

export default function LeftPanelStack() {
  const { state, dispatch } = useMRD();

  const handleAcceptSuggestion = (content: string) => {
    if (state.activeSectionId) {
      dispatch({
        type: 'SET_SECTION_CONTENT',
        payload: { sectionId: state.activeSectionId, content },
      });
      dispatch({
        type: 'MARK_SECTION_COMPLETE',
        payload: { sectionId: state.activeSectionId, isComplete: true },
      });
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.chatArea}>
        <ChatInterface
          activeSectionId={state.activeSectionId}
          onAcceptSuggestion={handleAcceptSuggestion}
        />
      </div>
      <div className={styles.sidebarArea}>
        <ProgressSidebar />
      </div>
    </div>
  );
}
