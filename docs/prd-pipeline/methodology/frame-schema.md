# Frame Schema — Shared Data Model
# MRD · PRD · DevLog · Composer

<!-- @MENTOR:CONTEXT This is the canonical frame type registry.
     Any agent or developer adding a new frame type MUST register it here first.
     The composer UI, renderer, and export pipeline all read from this schema. -->

---

## Frame Type Enum

```typescript
type FrameType =
  | 'header'
  | 'overview'
  | 'goals'
  | 'scope'
  | 'environments'
  | 'requirements'
  | 'acceptance'
  | 'assumptions'
  | 'checklist'
  | 'stage-resolution'   // DevLog only
  | 'decision-log';      // DevLog only
```

---

## Frame Registry

| Frame Type | Documents | Agent | Required Fields | Optional Fields |
|-----------|-----------|-------|----------------|-----------------|
| `header` | MRD, PRD, DevLog | All | `product_name`, `doc_type`, `version`, `date`, `status` | `subtitle`, `audience`, `prepared_by` |
| `overview` | MRD, PRD | Writing | `text` (1–3 paragraphs) | — |
| `goals` | MRD, PRD | Structuring → Writing | `goals[]` (id, text, priority) | — |
| `scope` | PRD | Writing | `scope_items[]` | — |
| `environments` | PRD | Writing | `environments[]` (name, description) | — |
| `requirements` | PRD | Writing | `blocks[]` → `items[]` (id, text, notes) | `spec_grid[]` |
| `acceptance` | PRD | Writing | `criteria[]` (text, type: binary) | — |
| `assumptions` | PRD | Writing | `assumptions[]` | — |
| `checklist` | PRD, DevLog | Writing | `features[]` (id, name, priority, applied, notes) | — |
| `stage-resolution` | DevLog | DevLog System | `stage_id`, `statuses{}`, `summary` | — |
| `decision-log` | DevLog | DevLog System | `entries[]` | — |

---

## Frame HTML Contract

Every frame must:

```html
<section
  data-frame="[frame-type]"
  data-doc-type="[mrd|prd|devlog]"
  data-version="[semver]"
  id="[frame-type]">
  <!-- frame content -->
</section>
```

The `data-frame` attribute is how the composer identifies and assembles frames.
The `id` attribute is how the nav system links to sections.
Both are required. Non-negotiable.

---

## Frame Data Schema (JSON)

Each frame stored in DB has this envelope:

```typescript
interface FrameRecord {
  frame_id: string;           // UUID
  document_id: string;        // parent doc UUID
  document_type: 'mrd' | 'prd' | 'devlog';
  frame_type: FrameType;
  version: string;            // "1.0", "1.1" — increments on re-generation
  html: string;               // rendered HTML string
  data: Record<string, unknown>; // structured data (source of truth for re-rendering)
  generated_at: Date;
  agent_version: string;      // which agent version produced this
}
```

---

## Audience Composition Map

The composer uses this map to default-select frames per audience:

```typescript
const AUDIENCE_FRAMES: Record<string, FrameType[]> = {
  'rd':          ['header','overview','goals','scope','environments','requirements','acceptance','assumptions','checklist'],
  'leadership':  ['header','overview','goals'],
  'client':      ['header','overview','goals','environments'],
  'marketing':   ['header','overview','goals','environments'],
  'devlog-full': ['header','stage-resolution','decision-log','checklist'],
};
```

The composer UI allows customization per export. These are defaults only.

---

## Style Contract

All frames use the Compulocks brand token system:

```css
/* Required CSS variables — must be present in any page rendering frames */
--navy:        #1D1F4A;
--navy-light:  #243469;
--green:       #009966;
--green-light: #1db274;
--bg:          #f2f2f2;
--white:       #ffffff;
--border:      rgba(29,31,74,0.09);
--font-head:   'Barlow Condensed', 'Arial Narrow', Arial, sans-serif;
--font-body:   'Barlow', 'Segoe UI', Arial, sans-serif;
```

Frames must not define their own color values outside these tokens.
This ensures any frame can be dropped into any page without visual inconsistency.

---

## Versioning

Frame schema versions follow semver:
- **Patch** (1.0.x): Bug fixes, copy corrections — no structural change
- **Minor** (1.x.0): New optional fields added — backwards compatible
- **Major** (x.0.0): Required fields added or removed — migration required

Current version: **1.0.0**

On schema major version bump:
1. Old frames retain their version tag
2. Renderer supports both versions simultaneously for 2 sprints
3. Migration script re-generates affected frames from stored `data` field
