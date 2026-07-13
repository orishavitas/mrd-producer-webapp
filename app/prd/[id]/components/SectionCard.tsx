'use client';

import { PRDSection, PRDComment, RequirementRow } from '@/agent/agents/prd/prd-document-types';
import RequirementsTableEditor from './RequirementsTableEditor';
import CommentPanel from './CommentPanel';

interface Props {
  prdId: string;
  section: PRDSection;
  comments: PRDComment[];
  currentUserEmail: string;
  onSectionChange: (section: PRDSection) => void;
  onCommentsChange: (comments: PRDComment[]) => void;
}

export default function SectionCard({ prdId, section, comments, currentUserEmail, onSectionChange, onCommentsChange }: Props) {
  return (
    <div className="section-card">
      <div className="section-header">
        <h3>{section.title}</h3>
        <label>
          <input
            type="checkbox"
            checked={section.enabled}
            onChange={(e) => onSectionChange({ ...section, enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>

      {section.enabled && (
        <>
          {Array.isArray(section.content) ? (
            <RequirementsTableEditor
              rows={section.content as RequirementRow[]}
              onChange={(rows) => onSectionChange({ ...section, content: rows })}
            />
          ) : (
            <textarea
              value={section.content as string}
              onChange={(e) => onSectionChange({ ...section, content: e.target.value })}
              rows={6}
            />
          )}
          <CommentPanel
            prdId={prdId}
            sectionKey={section.key}
            comments={comments}
            currentUserEmail={currentUserEmail}
            onCommentsChange={onCommentsChange}
          />
        </>
      )}
    </div>
  );
}
