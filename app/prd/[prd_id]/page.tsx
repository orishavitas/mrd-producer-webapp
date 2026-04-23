import { notFound } from 'next/navigation';
import { getPRDDocument, getPRDFrames } from '@/lib/prd-db';
import { PRDViewer } from '../components/PRDViewer';
import { PRDFrame } from '@/agent/agents/prd/types';
import styles from '../prd.module.css';

interface Props {
  params: Promise<{ prd_id: string }>;
}

export default async function PRDViewerPage({ params }: Props) {
  const { prd_id } = await params;
  const prdDoc = await getPRDDocument(prd_id);
  if (!prdDoc) notFound();

  const rawFrames = await getPRDFrames(prdDoc.id);

  // Map DB snake_case to agent camelCase
  const frames: PRDFrame[] = rawFrames.map((f: any) => ({
    sectionKey: f.section_key ?? f.sectionKey,
    sectionOrder: f.section_order ?? f.sectionOrder,
    content: f.content,
  }));

  return (
    <div className={styles.page}>
      <div className={styles.pipelineContainer}>
        <PRDViewer
          productName={prdDoc.product_name}
          frames={frames}
          prdDocumentId={prd_id}
          qaScore={prdDoc.qa_score ?? undefined}
          qaSuggestions={(prdDoc.qa_suggestions as { sectionKey: string; note: string }[] | null) ?? undefined}
        />
      </div>
    </div>
  );
}
