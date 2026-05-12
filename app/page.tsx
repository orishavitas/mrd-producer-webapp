import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { listDocumentsWithCreator, listAllDocumentsWithCreator, toLibraryDocument, toPRDLibraryDocument, type LibraryDocument } from '@/lib/db';
import { listPRDDocuments, listAllPRDDocuments } from '@/lib/prd-db';
import { getFeaturesForEmail } from '@/lib/feature-gate';
import TopBar from './components/TopBar';
import ToolCard from './components/ToolCard';
import DashboardShell from './components/DashboardShell';

const ALL_TOOLS = [
  {
    feature: 'mrd-generator' as const,
    title: 'MRD Generator',
    description: 'Generate comprehensive Market Requirements Documents with AI-powered research.',
    href: '/mrd',
    badge: 'AI',
  },
  {
    feature: 'one-pager' as const,
    title: 'One-Pager',
    description: 'Create concise product one-pagers for stakeholder communication.',
    href: '/one-pager',
  },
  {
    feature: 'brief-helper' as const,
    title: 'Brief Helper',
    description: 'Capture a quick product brief with AI-powered extraction, gap detection, and field expansion.',
    href: '/brief-helper',
  },
  {
    feature: 'one-pager-beta' as const,
    title: 'One-Pager (Beta)',
    description: 'Development sandbox for testing new AI features, database integration, and product-specific enhancements.',
    href: '/one-pager-beta',
    badge: 'Beta',
  },
  {
    feature: 'prd-producer' as const,
    title: 'PRD Producer',
    description: 'Transform a saved One-Pager into a structured engineering PRD with a 4-agent AI pipeline.',
    href: '/prd',
    badge: 'Alpha',
  },
  {
    feature: 'one-pager-alpha' as const,
    title: 'One-Pager · M3',
    description: 'One-Pager with a full M3 design refresh — numbered section headers, card-based preview dashboard, and Material-3 controls.',
    href: '/one-pager-alpha',
    badge: 'Alpha',
  },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/login');

  const email = session.user.email;
  const features = getFeaturesForEmail(email);
  const hasPRD = features.has('prd-producer');
  const isRDViewer = features.has('rd-viewer');

  let libraryDocs: LibraryDocument[] = [];
  try {
    const [opDocs, prdDocs] = await Promise.all([
      isRDViewer ? listAllDocumentsWithCreator() : listDocumentsWithCreator(email),
      hasPRD || isRDViewer
        ? isRDViewer ? listAllPRDDocuments() : listPRDDocuments(email)
        : Promise.resolve([]),
    ]);
    libraryDocs = [
      ...opDocs
        .filter((d) => d.tool_type === 'one-pager')
        .map(toLibraryDocument),
      ...prdDocs.map(toPRDLibraryDocument),
    ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    // DB not configured — show empty state
  }

  const tools = ALL_TOOLS.filter((t) => features.has(t.feature));

  return (
    <>
      <TopBar />
      <main className="page">
        <div className="container" style={{ maxWidth: '900px', padding: '2rem 1.5rem' }}>
          <header style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Welcome{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Choose a tool to get started.</p>
          </header>

          <section>
            <h2 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: '0.75rem' }}>
              Tools
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {tools.map(({ feature: _, ...tool }) => (
                <ToolCard key={tool.href} {...tool} />
              ))}
            </div>
          </section>

          <DashboardShell initialDocuments={libraryDocs} currentUserEmail={email} />
        </div>
      </main>
    </>
  );
}
