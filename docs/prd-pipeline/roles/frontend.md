# Frontend Developer Role File
# Frame Renderer · Composer UI · Export Pipeline

<!-- @MENTOR:CONTEXT Read after CLAUDE.md and methodology/frame-schema.md.
     You own the rendering layer, the composer UI, and the export pipeline.
     Agents produce data. You turn that data into HTML and UI.
     Do not touch agent code. Do not touch DB schema. -->

---

## YOUR SCOPE

You own:
- Frame renderer components (`src/components/frames/`)
- PRD document page (`src/app/prd/[id]/`)
- DevLog document page (`src/app/devlog/[id]/`)
- Frame composer UI (`src/components/composer/`)
- Export pipeline (HTML download, PDF via print CSS)
- Extending the existing HTML preview from mrd-producer-webapp

You do NOT own:
- Agent logic (backend)
- Database schema (system engineer)
- Visual design and brand tokens (UI/UX — consume their tokens, don't define them)

---

## FRAME RENDERER ARCHITECTURE

The renderer is a React component that takes a `FrameRecord` and outputs
the correct HTML frame component:

```typescript
// src/components/frames/FrameRenderer.tsx
import type { FrameRecord } from '@/lib/agents/prd/types';
import { HeaderFrame } from './HeaderFrame';
import { OverviewFrame } from './OverviewFrame';
import { GoalsFrame } from './GoalsFrame';
import { RequirementsFrame } from './RequirementsFrame';
import { ChecklistFrame } from './ChecklistFrame';
import { StageResolutionFrame } from './StageResolutionFrame';
import { DecisionLogFrame } from './DecisionLogFrame';
// ... all frame types

const FRAME_MAP: Record<FrameType, React.ComponentType<{ data: unknown }>> = {
  header: HeaderFrame,
  overview: OverviewFrame,
  goals: GoalsFrame,
  // ...
};

export function FrameRenderer({ frame }: { frame: FrameRecord }) {
  const Component = FRAME_MAP[frame.frame_type];
  if (!Component) return null;
  return (
    <section
      data-frame={frame.frame_type}
      data-doc-type={frame.document_type}
      data-version={frame.version}
      id={frame.frame_type}
    >
      <Component data={frame.data} />
    </section>
  );
}
```

Each frame component renders from `data` (structured JSON), not from the
stored `html` string. The `html` string is for static export only.

---

## FILE STRUCTURE TO CREATE

```
src/components/
  ├── frames/
  │   ├── FrameRenderer.tsx       ← dispatch component
  │   ├── HeaderFrame.tsx
  │   ├── OverviewFrame.tsx
  │   ├── GoalsFrame.tsx
  │   ├── ScopeFrame.tsx
  │   ├── EnvironmentsFrame.tsx
  │   ├── RequirementsFrame.tsx
  │   ├── AcceptanceFrame.tsx
  │   ├── AssumptionsFrame.tsx
  │   ├── ChecklistFrame.tsx
  │   ├── StageResolutionFrame.tsx
  │   └── DecisionLogFrame.tsx
  │
  ├── composer/
  │   ├── Composer.tsx             ← main composer UI
  │   ├── FrameSelector.tsx        ← checkboxes for frame selection
  │   ├── AudiencePreset.tsx       ← preset audience buttons
  │   ├── ComposerPreview.tsx      ← live preview pane
  │   └── ExportBar.tsx            ← export actions (HTML/PDF/DOCX)
  │
  ├── prd/
  │   ├── PRDDocument.tsx          ← full PRD page layout
  │   └── PRDNav.tsx               ← sticky nav with section links
  │
  └── devlog/
      ├── DevLogDocument.tsx       ← full DevLog page layout
      ├── StageRail.tsx            ← stage switcher
      ├── StatusPill.tsx           ← clickable status badges
      └── DecisionLogEntry.tsx     ← individual log entry component

src/app/
  ├── prd/[id]/page.tsx
  └── devlog/[id]/page.tsx
```

---

## PRD DOCUMENT PAGE

```typescript
// src/app/prd/[id]/page.tsx
import { getPRD } from '@/lib/api/prd';
import { PRDDocument } from '@/components/prd/PRDDocument';

export default async function PRDPage({ params }: { params: { id: string } }) {
  const { prd, frames } = await getPRD(params.id);
  return <PRDDocument prd={prd} frames={frames} />;
}
```

The page is a server component. Data fetching happens here. `PRDDocument` is
a client component that handles the nav interaction.

---

## COMPOSER UI

The composer is the feature that makes this system worth building.
It lets a user select frames from any combination of MRD, PRD, and DevLog
documents and assemble them into a single HTML page.

```typescript
// src/components/composer/Composer.tsx
'use client';

interface ComposerProps {
  availableDocuments: Array<{
    doc_type: 'mrd' | 'prd' | 'devlog';
    doc_id: string;
    product_name: string;
    frames: FrameRecord[];
  }>;
}

// UI flow:
// 1. User selects which documents to draw from
// 2. Frame selector shows available frames per document
// 3. Audience preset pre-selects frames (user can override)
// 4. Live preview updates on selection change
// 5. Export bar: "Download HTML" | "Export PDF" | "Export DOCX"
```

Key constraint: the composer calls `POST /api/frames/compose` to get the
assembled HTML. It does not assemble frames client-side. This keeps the
rendering logic server-side and testable.

---

## EXPORT PIPELINE

### HTML Export
```typescript
// Download assembled HTML as a file
async function exportHTML(composed_html: string, filename: string) {
  const blob = new Blob([composed_html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### PDF Export
PDF export uses the browser print dialog with print-specific CSS already
defined in the frame styles. No Puppeteer needed for basic cases.

```typescript
// Trigger browser print for PDF
function exportPDF() {
  window.print();
  // Print CSS in frame styles handles: hide nav, color preservation,
  // page breaks, header repeat
}
```

For server-side PDF generation (if needed later):
- Use Puppeteer in a Vercel Function
- This is NOT in scope for v1 — browser print covers 90% of cases

### DOCX Export
Reuse the existing DOCX export pipeline from mrd-producer-webapp.
The assembled HTML → DOCX conversion already exists.
Check `src/lib/export/docx.ts` for the current implementation.

---

## CSS ARCHITECTURE

Frames use CSS custom properties from the Compulocks brand token system.
All tokens defined in `src/styles/brand-tokens.css`.

```css
/* Import in layout.tsx or global.css */
@import '@/styles/brand-tokens.css';
```

Frame components use Tailwind for layout but CSS variables for colors.
Never hardcode color values in frame components. Always use tokens.

```tsx
// Correct
<div style={{ background: 'var(--navy)' }}>

// Wrong
<div className="bg-[#1D1F4A]">
```

This ensures the composer can override tokens per export (e.g., client
color scheme) without touching component code.

---

## EXTENDING THE EXISTING HTML PREVIEW

The mrd-producer-webapp has an HTML preview component. Before building
a new one, check:

1. `src/components/preview/` — existing preview components
2. `src/lib/export/html.ts` — existing HTML generation

The goal is to extend this infrastructure, not replace it. The PRD and
DevLog renderers should feel like natural extensions of the MRD preview.

---

## HANDOFF CHECKLIST

- [ ] All frame components implemented and rendering from `data` JSON
- [ ] PRD document page live at `/prd/[id]`
- [ ] DevLog document page live at `/devlog/[id]`
- [ ] Composer UI: frame selection + audience presets + live preview
- [ ] HTML export working
- [ ] PDF export working (browser print)
- [ ] DOCX export wired to existing pipeline
- [ ] Verified: frame `data-frame` and `id` attributes present on every rendered section
