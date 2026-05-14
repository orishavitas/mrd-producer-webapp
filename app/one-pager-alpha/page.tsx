'use client';

import { OnePagerProvider, useOnePager } from '../one-pager/lib/one-pager-context';
import type { FeatureCategory } from '../one-pager/components/FeatureSelector';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './alpha-tokens.css';
import './alpha.css';

interface ConfigData {
  environments: { id: string; label: string }[];
  industries: { id: string; label: string }[];
  standardFeatures: FeatureCategory[];
}

/* ──────────────────────────────────────────
   Icon set — inline SVG (16px, stroke)
────────────────────────────────────────── */
const Ico = {
  user: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12V4h8l10 10-8 8z"/><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/>
    </svg>
  ),
  save: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3"/>
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v13"/><path d="M7 12l5 5 5-5"/><path d="M5 21h14"/>
    </svg>
  ),
  print: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="9" rx="2"/><rect x="7" y="15" width="10" height="6"/>
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1.5-1.5"/>
    </svg>
  ),
  scope: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
    </svg>
  ),
  cash: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l4.5 4.5L19 7"/>
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/>
    </svg>
  ),
  reset: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/>
    </svg>
  ),
};

/* ──────────────────────────────────────────
   Shared tiny atoms
────────────────────────────────────────── */
function cls(...args: (string | false | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

function SectionHeader({
  number,
  title,
  hint,
  right,
}: {
  number?: number | null;
  title: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="section-header">
      <div className="section-header-row">
        <div className="section-header-left">
          {number != null && (
            <span className="section-number">{String(number).padStart(2, '0')}</span>
          )}
          <div>
            <h3 className="section-title">{title}</h3>
            {hint && <p className="section-hint">{hint}</p>}
          </div>
        </div>
        {right && <div>{right}</div>}
      </div>
      <div className="section-rule" />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="m3-field">
      <label className="m3-field-label">{label}</label>
      <div className="m3-field-input">
        {icon && <span className="m3-field-icon">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      {hint && <div className="m3-field-hint">{hint}</div>}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="m3-field">
      <div className="m3-field-row">
        <label className="m3-field-label">{label}</label>
        {action}
      </div>
      <div className="m3-field-textarea">
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function Btn({
  children,
  variant = 'tonal',
  icon,
  onClick,
  disabled,
  title,
  size,
}: {
  children?: React.ReactNode;
  variant?: 'filled' | 'accent' | 'outlined' | 'tonal' | 'text' | 'ghost';
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  size?: 'sm';
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cls('btn', `btn--${variant}`, size && `btn--${size}`)}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
}

function CheckTile({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cls('check-tile', selected && 'check-tile--selected')}
      onClick={onClick}
    >
      <span className={cls('check-box', selected && 'check-box--on')}>
        {selected && (
          <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
            <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}

function Chip({
  children,
  variant,
  onClick,
}: {
  children: React.ReactNode;
  variant?: 'selected' | 'must' | 'nice' | 'ghost';
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={cls('chip', variant && `chip--${variant}`)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Segmented({
  options,
  value,
  onChange,
  size,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  size?: 'sm';
}) {
  return (
    <div className={cls('segmented', size === 'sm' && 'segmented--sm')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cls('seg', value === o.value && 'seg--on')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────
   Expand with AI helper
────────────────────────────────────────── */
function useAiExpand(field: 'description' | 'goal' | 'useCases') {
  const { state, dispatch } = useOnePager();
  const [isExpanding, setIsExpanding] = useState(false);

  const expandedKey =
    field === 'description'
      ? 'expandedDescription'
      : field === 'goal'
      ? 'expandedGoal'
      : 'expandedUseCases';

  const value = state[field as keyof typeof state] as string;
  const expandedValue = state[expandedKey as keyof typeof state] as string;

  const handleExpand = useCallback(async () => {
    if (value.length < 10) return;
    setIsExpanding(true);
    try {
      const res = await fetch('/api/one-pager/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, text: value }),
      });
      const data = await res.json();
      if (data.expanded) {
        const actionMap = {
          description: 'SET_EXPANDED_DESCRIPTION',
          goal: 'SET_EXPANDED_GOAL',
          useCases: 'SET_EXPANDED_USE_CASES',
        } as const;
        dispatch({ type: actionMap[field], payload: data.expanded });
      }
    } catch {
      /* silent */
    } finally {
      setIsExpanding(false);
    }
  }, [value, field, dispatch]);

  return { isExpanding, handleExpand, expandedValue };
}

/* ──────────────────────────────────────────
   Dashboard stat helpers
────────────────────────────────────────── */
function computeCompletion(state: ReturnType<typeof useOnePager>['state']) {
  const checks = [
    !!state.productName,
    !!state.preparedBy,
    !!state.userEmail,
    !!(state.description || state.expandedDescription),
    !!(state.goal || state.expandedGoal),
    !!(state.useCases || state.expandedUseCases),
    (state.context.environments?.length ?? 0) > 0,
    (state.context.industries?.length ?? 0) > 0,
    (state.audience.predefined?.length ?? 0) > 0,
    (state.features.mustHave?.length ?? 0) > 0,
    !!state.commercials.moq,
    !!state.commercials.targetPrice,
    (state.competitors?.length ?? 0) > 0,
  ];
  return Math.round((100 * checks.filter(Boolean).length) / checks.length);
}

/* ──────────────────────────────────────────
   Preview panel
────────────────────────────────────────── */
function DashCardHeader({
  index,
  title,
  right,
}: {
  index: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="dash-card-head">
      <div className="dash-card-head-left">
        <span className="dash-card-idx">{index}</span>
        <h3 className="dash-card-title">{title}</h3>
      </div>
      {right}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  bar,
}: {
  label: string;
  value: string | number;
  sub?: string;
  bar?: number;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {bar != null ? (
        <div className="stat-bar">
          <div className="stat-bar-fill" style={{ width: `${bar}%` }} />
        </div>
      ) : (
        <div className="stat-sub">{sub}</div>
      )}
    </div>
  );
}

function PreviewPanel({ mode }: { mode: 'cards' | 'paper' }) {
  const { state } = useOnePager();
  const completion = computeCompletion(state);
  const featureCount =
    (state.features.mustHave?.length ?? 0) + (state.features.niceToHave?.length ?? 0);

  const allRoles = [...(state.audience.predefined ?? []), ...(state.audience.custom ?? [])];
  const desc = state.expandedDescription || state.description;
  const goal = state.expandedGoal || state.goal;
  const useCases = state.expandedUseCases || state.useCases;
  const paint = state.customization?.paint;

  return (
    <div className="preview-panel">
      <div className="preview-chrome">
        <div className="preview-chrome-left">
          <span className="preview-eyebrow">Live preview</span>
          <h2 className="preview-title">Marketing Requirement Document</h2>
        </div>
        <div className="preview-chrome-right">
          <span className={cls('status-pill', state.isPublished ? 'status-pill--published' : 'status-pill--draft')}>
            <span className="status-dot" />
            {state.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>
      </div>

      <div className="preview-scroll">
        <div className="dash">
          {/* Hero */}
          <div className="card dash-hero">
            <div className="dash-hero-bg" />
            <div className="dash-hero-body">
              <div className="dash-hero-eyebrow">
                <img
                  src="/compulocks-logo.svg"
                  alt="Compulocks"
                  className="dash-hero-logo"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="dash-hero-slogan">Display. Secure. Engage.</span>
              </div>
              <h1 className="dash-hero-title">{state.productName || 'Untitled product'}</h1>
              <div className="dash-hero-meta">
                <span>
                  <strong>Prepared by</strong>{' '}
                  {state.preparedBy || '—'}
                </span>
                <span className="dot-sep">·</span>
                <span>
                  <strong>Contact</strong>{' '}
                  {state.userEmail || '—'}
                </span>
                <span className="dot-sep">·</span>
                <span>
                  <strong>Drafted</strong>{' '}
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="stat-row">
            <StatTile label="Completion" value={`${completion}%`} bar={completion} />
            <StatTile label="Roles" value={allRoles.length} sub="target users" />
            <StatTile
              label="Features"
              value={featureCount}
              sub={`${state.features.mustHave?.length ?? 0} must · ${state.features.niceToHave?.length ?? 0} nice`}
            />
            <StatTile label="Competitors" value={state.competitors?.length ?? 0} sub="tracked" />
          </div>

          {/* Dashboard cards */}
          <div className="dash-grid">
            {/* Description */}
            <div className="card dash-card dash-card--wide">
              <DashCardHeader index="01" title="Product Description" />
              <p className="dash-body">{desc || <span className="muted">Empty</span>}</p>
            </div>

            {/* Goal */}
            <div className="card dash-card">
              <DashCardHeader index="02" title="Goal" />
              <p className="dash-body">{goal || <span className="muted">Empty</span>}</p>
            </div>

            {/* Where */}
            <div className="card dash-card">
              <DashCardHeader index="03" title="Where" />
              <div className="kv">
                <div className="kv-key">Environment</div>
                <div className="kv-val">
                  {(state.context.environments?.length ?? 0) === 0 ? (
                    <span className="muted">—</span>
                  ) : (
                    <div className="chip-row chip-row--inline">
                      {state.context.environments.map((e) => (
                        <span key={e} className="chip chip--ghost">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="kv">
                <div className="kv-key">Industry</div>
                <div className="kv-val">
                  {(state.context.industries?.length ?? 0) === 0 ? (
                    <span className="muted">—</span>
                  ) : (
                    <div className="chip-row chip-row--inline">
                      {state.context.industries.map((i) => (
                        <span key={i} className="chip chip--ghost">
                          {i}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Who */}
            <div className="card dash-card dash-card--wide">
              <DashCardHeader
                index="04"
                title="Who · Target Audience"
              />
              {allRoles.length === 0 ? (
                <span className="muted">—</span>
              ) : (
                <div className="chip-row chip-row--inline">
                  {allRoles.map((r) => (
                    <span key={r} className="chip chip--ghost">
                      <span className="m3-field-icon">{Ico.user}</span>
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Use cases */}
            <div className="card dash-card dash-card--wide">
              <DashCardHeader index="·" title="Use Cases" />
              <p className="dash-body">{useCases || <span className="muted">Empty</span>}</p>
            </div>

            {/* Features */}
            <div className="card dash-card dash-card--wide">
              <DashCardHeader index="05" title="Features" />
              <div className="feature-split">
                <div>
                  <div className="feature-bucket-head">
                    <span className="legend-dot legend-dot--must" />
                    Must Have{' '}
                    <span className="count">{state.features.mustHave?.length ?? 0}</span>
                  </div>
                  <ul className="feature-list">
                    {(state.features.mustHave ?? []).map((f) => (
                      <li key={f}>
                        <span className="check-mark">{Ico.check}</span>
                        {f}
                      </li>
                    ))}
                    {(state.features.mustHave?.length ?? 0) === 0 && (
                      <li className="muted">—</li>
                    )}
                  </ul>
                </div>
                <div>
                  <div className="feature-bucket-head">
                    <span className="legend-dot legend-dot--nice" />
                    Nice to Have{' '}
                    <span className="count">{state.features.niceToHave?.length ?? 0}</span>
                  </div>
                  <ul className="feature-list">
                    {(state.features.niceToHave ?? []).map((f) => (
                      <li key={f}>
                        <span className="check-mark">{Ico.check}</span>
                        {f}
                      </li>
                    ))}
                    {(state.features.niceToHave?.length ?? 0) === 0 && (
                      <li className="muted">—</li>
                    )}
                  </ul>
                </div>
              </div>
              {paint?.finish && (
                <div className="paint-pill">
                  <span className="paint-swatch" />
                  <span>
                    <strong>{paint.finish}</strong>
                    {paint.colors?.length ? ` · ${paint.colors.join(', ')}` : ''}
                    {paint.description ? ` — ${paint.description}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Commercials */}
            <div className="card dash-card">
              <DashCardHeader index="06" title="Commercials" />
              <div className="metric-row">
                <div className="metric">
                  <span className="metric-label">MOQ</span>
                  <span className="metric-value">{state.commercials.moq || '—'}</span>
                </div>
                <div className="metric metric--accent">
                  <span className="metric-label">Target Price</span>
                  <span className="metric-value">{state.commercials.targetPrice || '—'}</span>
                </div>
              </div>
            </div>

            {/* Competitors */}
            <div className="card dash-card dash-card--wide">
              <DashCardHeader
                index="07"
                title="Competitors"
                right={
                  <span className="count--bare">
                    {state.competitors?.length ?? 0} tracked
                  </span>
                }
              />
              <div className="competitor-grid">
                {(state.competitors ?? []).map((c, i) => (
                  <div className="comp-card" key={i}>
                    <div className="comp-card-thumb">
                      {c.photoUrls?.[0] ? (
                        <img
                          src={c.photoUrls[0]}
                          alt={c.productName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <>
                          <svg viewBox="0 0 120 80">
                            <defs>
                              <pattern
                                id={`pp${i}`}
                                width="6"
                                height="6"
                                patternUnits="userSpaceOnUse"
                                patternTransform="rotate(45)"
                              >
                                <rect width="3" height="6" fill="currentColor" opacity="0.20" />
                              </pattern>
                            </defs>
                            <rect width="120" height="80" fill={`url(#pp${i})`} />
                          </svg>
                          <span className="comp-thumb-label">product shot</span>
                        </>
                      )}
                    </div>
                    <div className="comp-card-body">
                      <div className="comp-card-brand">{c.brand || 'Unknown brand'}</div>
                      <div className="comp-card-name">{c.productName || c.url}</div>
                      <div className="comp-card-bottom">
                        <span className="comp-price">{c.cost || '—'}</span>
                        <span className="comp-link">{c.url}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(state.competitors?.length ?? 0) === 0 && (
                  <span className="muted" style={{ gridColumn: '1/-1', padding: '8px 0' }}>
                    No competitors added yet
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="dash-footer">
            <div className="dash-footer-rule" />
            <div className="dash-footer-row">
              <img
                src="/compulocks-logo.svg"
                alt=""
                className="dash-footer-logo"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="dash-footer-slogan">DISPLAY · SECURE · ENGAGE</span>
              <span className="dash-footer-meta">MRD / Internal — confidential</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   Form panel
────────────────────────────────────────── */
const ROLES_BY_IND: Record<string, string[]> = {
  healthcare: ['Nursing Staff', 'Physicians', 'Reception', 'IT Admins', 'Patients'],
  hospitality: ['Hotel Front Desk', 'Concierge', 'Hostesses', 'Servers', 'Shift Managers'],
  retail: ['Store Managers', 'Cashiers', 'Stock Associates', 'Visual Merchandisers', 'Loss Prevention'],
  technology: ['IT Admins', 'Developers', 'QA Engineers', 'Support Staff'],
  manufacturing: ['Floor Supervisors', 'Technicians', 'Quality Inspectors', 'Logistics Managers'],
  education: ['Teachers', 'Students', 'Administrators', 'IT Coordinators'],
  finance: ['Tellers', 'Advisors', 'Compliance Officers', 'Branch Managers'],
  logistics: ['Warehouse Workers', 'Drivers', 'Dispatchers', 'Operations Managers'],
  government: ['Public Officials', 'Administrative Staff', 'Security Personnel'],
};

const FEATURE_CATS = [
  {
    id: 'screen_size',
    label: 'Screen Size',
    features: ['Small (6"–10")', 'Medium (10"–15")', 'Large (15"–24")', 'XL (24"–32")', 'XXL (32"+)'],
  },
  {
    id: 'orientation',
    label: 'Orientation',
    features: ['Landscape', 'Portrait', 'Auto-Rotate'],
  },
  {
    id: 'placement',
    label: 'Placement',
    features: ['Wall Mount', 'Counter / Desktop', 'Floor Stand', 'Ceiling Mount', 'Pole / Kiosk'],
  },
  {
    id: 'security',
    label: 'Security & Cable',
    features: ['Cable Management', 'Lock Slot (Kensington)', 'Locking Enclosure', 'Anti-Theft Bracket', 'Tamper-Proof Screws'],
  },
];

function FormPanel({
  config,
  isAutoFilling,
  onAutoFill,
}: {
  config: ConfigData | null;
  isAutoFilling: boolean;
  onAutoFill: () => void;
}) {
  const { state, dispatch } = useOnePager();
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [customFeatureInput, setCustomFeatureInput] = useState('');
  const [competitorInput, setCompetitorInput] = useState('');
  const [scrapingUrl, setScrapingUrl] = useState<string | null>(null);

  const desc = useAiExpand('description');
  const goal = useAiExpand('goal');
  const useCases = useAiExpand('useCases');

  const toggleEnv = (id: string) => dispatch({ type: 'TOGGLE_ENVIRONMENT', payload: id });
  const toggleInd = (id: string) => dispatch({ type: 'TOGGLE_INDUSTRY', payload: id });
  const toggleRole = (role: string) => dispatch({ type: 'TOGGLE_ROLE', payload: role });

  const featureState = (label: string): 'must' | 'nice' | 'off' => {
    if (state.features.mustHave?.includes(label)) return 'must';
    if (state.features.niceToHave?.includes(label)) return 'nice';
    return 'off';
  };

  const toggleFeature = (label: string) => {
    const fs = featureState(label);
    if (fs === 'off') {
      dispatch({ type: 'ADD_FEATURE', payload: { category: 'mustHave', feature: label } });
    } else if (fs === 'must') {
      dispatch({ type: 'REMOVE_FEATURE', payload: { category: 'mustHave', feature: label } });
      dispatch({ type: 'ADD_FEATURE', payload: { category: 'niceToHave', feature: label } });
    } else {
      dispatch({ type: 'REMOVE_FEATURE', payload: { category: 'niceToHave', feature: label } });
    }
  };

  const handleScrape = async () => {
    const url = competitorInput.trim();
    if (!url) return;
    setScrapingUrl(url);
    dispatch({ type: 'ADD_COMPETITOR', payload: { url } });
    setCompetitorInput('');
    try {
      const res = await fetch('/api/one-pager/extract-competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data) {
        dispatch({ type: 'UPDATE_COMPETITOR', payload: { url, data } });
      }
    } catch {
      /* silent */
    } finally {
      setScrapingUrl(null);
    }
  };

  const environments = config?.environments ?? [];
  const industries = config?.industries ?? [];

  const paint = state.customization?.paint ?? { finish: '', colors: [], description: '' };
  const setPaint = (patch: { finish?: '' | 'gloss' | 'satin' | 'matte' | 'textured'; colors?: string[]; description?: string }) => {
    if (patch.finish !== undefined) dispatch({ type: 'SET_PAINT_FINISH', payload: patch.finish });
    if (patch.description !== undefined) dispatch({ type: 'SET_PAINT_DESCRIPTION', payload: patch.description });
  };

  const canExpand = (v: string) => v.length >= 10;

  return (
    <div className="form-panel">
      {/* Doc info */}
      <section>
        <SectionHeader title="Document" hint="Who is drafting this MRD and what product it covers." />
        <div className="card form-card">
          <div className="grid-2">
            <TextField
              label="Product Name"
              value={state.productName}
              onChange={(v) => dispatch({ type: 'SET_PRODUCT_NAME', payload: v })}
              placeholder='e.g., iPad 13" Wall Enclosure'
              icon={Ico.tag}
            />
            <TextField
              label="Prepared By"
              value={state.preparedBy}
              onChange={(v) => dispatch({ type: 'SET_PREPARED_BY', payload: v })}
              placeholder="Your name"
              icon={Ico.user}
            />
          </div>
          <TextField
            label="Email"
            value={state.userEmail}
            onChange={(v) => dispatch({ type: 'SET_USER_EMAIL', payload: v })}
            placeholder="you@compulocks.com"
            icon={Ico.mail}
            type="email"
          />
        </div>
      </section>

      {/* 01 Description */}
      <section>
        <SectionHeader
          number={1}
          title="Product Description"
          hint="The headline pitch. What is it, in one paragraph."
          right={
            <Btn
              variant="text"
              size="sm"
              icon={Ico.spark}
              onClick={desc.handleExpand}
              disabled={!canExpand(state.description) || desc.isExpanding}
            >
              {desc.isExpanding ? 'Expanding…' : 'Expand with AI'}
            </Btn>
          }
        />
        <div className="card form-card form-card--tight">
          <TextArea
            label="Description"
            value={state.description}
            onChange={(v) => dispatch({ type: 'SET_DESCRIPTION', payload: v })}
            rows={4}
            placeholder="Describe your product concept…"
          />
          {desc.expandedValue && (
            <TextArea
              label="AI Expanded"
              value={desc.expandedValue}
              onChange={(v) => dispatch({ type: 'SET_EXPANDED_DESCRIPTION', payload: v })}
              rows={5}
            />
          )}
        </div>
      </section>

      {/* 02 Goal */}
      <section>
        <SectionHeader
          number={2}
          title="Goal"
          hint="The business outcome this product unlocks."
          right={
            <Btn
              variant="text"
              size="sm"
              icon={Ico.spark}
              onClick={goal.handleExpand}
              disabled={!canExpand(state.goal) || goal.isExpanding}
            >
              {goal.isExpanding ? 'Expanding…' : 'Expand with AI'}
            </Btn>
          }
        />
        <div className="card form-card form-card--tight">
          <TextArea
            label="Goal"
            value={state.goal}
            onChange={(v) => dispatch({ type: 'SET_GOAL', payload: v })}
            rows={3}
            placeholder="What is the goal of this product?"
          />
          {goal.expandedValue && (
            <TextArea
              label="AI Expanded"
              value={goal.expandedValue}
              onChange={(v) => dispatch({ type: 'SET_EXPANDED_GOAL', payload: v })}
              rows={4}
            />
          )}
        </div>
      </section>

      {/* 03 Where */}
      <section>
        <SectionHeader number={3} title="Where" hint="Environment and industry context." />
        <div className="card form-card">
          <div className="subhead">Environment</div>
          <div className="tile-grid tile-grid--3">
            {(environments.length > 0
              ? environments
              : [
                  { id: 'indoor', label: 'Indoor' },
                  { id: 'outdoor', label: 'Outdoor' },
                  { id: 'cloud', label: 'Cloud / SaaS' },
                  { id: 'on-prem', label: 'On-Premises' },
                  { id: 'mobile', label: 'Mobile / Field' },
                  { id: 'warehouse', label: 'Warehouse' },
                ]
            ).map((e) => (
              <CheckTile
                key={e.id}
                label={e.label}
                selected={state.context.environments?.includes(e.id) ?? false}
                onClick={() => toggleEnv(e.id)}
              />
            ))}
          </div>
          <div className="subhead subhead--spaced">Industry</div>
          <div className="tile-grid tile-grid--3">
            {(industries.length > 0
              ? industries
              : [
                  { id: 'healthcare', label: 'Healthcare' },
                  { id: 'hospitality', label: 'Hospitality' },
                  { id: 'retail', label: 'Retail' },
                  { id: 'technology', label: 'Technology' },
                  { id: 'manufacturing', label: 'Manufacturing' },
                  { id: 'education', label: 'Education' },
                  { id: 'finance', label: 'Finance' },
                  { id: 'logistics', label: 'Logistics' },
                  { id: 'government', label: 'Government' },
                ]
            ).map((i) => (
              <CheckTile
                key={i.id}
                label={i.label}
                selected={state.context.industries?.includes(i.id) ?? false}
                onClick={() => toggleInd(i.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 04 Who */}
      <section>
        <SectionHeader
          number={4}
          title="Who"
          hint="Target audience — roles inferred from industry."
          right={
            <span className="badge badge--accent">
              {(state.audience.predefined?.length ?? 0) + (state.audience.custom?.length ?? 0)} selected
            </span>
          }
        />
        <div className="card form-card">
          {(state.context.industries?.length ?? 0) === 0 ? (
            <div className="empty-hint">Pick an industry above to see suggested roles.</div>
          ) : (
            <>
              {(state.context.industries ?? []).map((indId) => {
                const list = ROLES_BY_IND[indId] ?? [];
                if (list.length === 0) return null;
                const indLabel =
                  [...(industries), { id: indId, label: indId }].find((x) => x.id === indId)?.label ?? indId;
                return (
                  <div className="role-group" key={indId}>
                    <div className="subhead">{indLabel}</div>
                    <div className="chip-row">
                      {list.map((r) => (
                        <Chip
                          key={r}
                          variant={state.audience.predefined?.includes(r) ? 'selected' : undefined}
                          onClick={() => toggleRole(r)}
                        >
                          {r}
                        </Chip>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          {/* Custom roles */}
          {(state.audience.custom?.length ?? 0) > 0 && (
            <div className="role-group">
              <div className="subhead">Custom</div>
              <div className="chip-row">
                {state.audience.custom.map((r) => (
                  <Chip key={r} variant="selected">
                    {r}
                    <button
                      type="button"
                      style={{ marginLeft: 4, opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}
                      onClick={() => dispatch({ type: 'REMOVE_CUSTOM_ROLE', payload: r })}
                    >
                      ×
                    </button>
                  </Chip>
                ))}
              </div>
            </div>
          )}
          <div className="custom-add">
            <input
              className="m3-bare-input"
              placeholder="Add custom role…"
              value={customRoleInput}
              onChange={(e) => setCustomRoleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customRoleInput.trim()) {
                  dispatch({ type: 'ADD_CUSTOM_ROLE', payload: customRoleInput.trim() });
                  setCustomRoleInput('');
                }
              }}
            />
            <Btn
              variant="text"
              icon={Ico.plus}
              size="sm"
              onClick={() => {
                if (customRoleInput.trim()) {
                  dispatch({ type: 'ADD_CUSTOM_ROLE', payload: customRoleInput.trim() });
                  setCustomRoleInput('');
                }
              }}
            >
              Add
            </Btn>
          </div>
        </div>

        {/* Use cases */}
        <div style={{ marginTop: 'var(--a-sp-4)' }}>
          <SectionHeader
            title="Use Cases"
            hint="How the device will be used in practice."
            right={
              <Btn
                variant="text"
                size="sm"
                icon={Ico.spark}
                onClick={useCases.handleExpand}
                disabled={!canExpand(state.useCases) || useCases.isExpanding}
              >
                {useCases.isExpanding ? 'Expanding…' : 'Expand with AI'}
              </Btn>
            }
          />
          <div className="card form-card form-card--tight" style={{ marginTop: 'var(--a-sp-3)' }}>
            <TextArea
              label="Use Cases"
              value={state.useCases}
              onChange={(v) => dispatch({ type: 'SET_USE_CASES', payload: v })}
              rows={3}
              placeholder="Describe how the device will be used…"
            />
            {useCases.expandedValue && (
              <TextArea
                label="AI Expanded"
                value={useCases.expandedValue}
                onChange={(v) => dispatch({ type: 'SET_EXPANDED_USE_CASES', payload: v })}
                rows={4}
              />
            )}
          </div>
        </div>
      </section>

      {/* 05 Features */}
      <section>
        <SectionHeader
          number={5}
          title="Features"
          hint="Tap once for Must Have, tap again for Nice to Have."
          right={
            <Btn
              variant="text"
              size="sm"
              icon={Ico.spark}
              onClick={onAutoFill}
              disabled={isAutoFilling}
            >
              {isAutoFilling ? 'Auto-filling…' : 'Auto-fill'}
            </Btn>
          }
        />
        <div className="card form-card">
          <div className="legend-row">
            <span className="legend-dot legend-dot--must" />
            <span className="legend-label">Must Have</span>
            <span className="legend-dot legend-dot--nice" />
            <span className="legend-label">Nice to Have</span>
          </div>

          {(config?.standardFeatures?.length ? config.standardFeatures : FEATURE_CATS).map((cat) => (
            <div key={cat.id} className="feature-group">
              <div className="subhead">{cat.label}</div>
              <div className="chip-row">
                {cat.features.map((f: { label: string } | string) => {
                  const label = typeof f === 'string' ? f : f.label;
                  const s = featureState(label);
                  return (
                    <Chip
                      key={label}
                      variant={s === 'must' ? 'must' : s === 'nice' ? 'nice' : undefined}
                      onClick={() => toggleFeature(label)}
                    >
                      {label}
                    </Chip>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="custom-add">
            <input
              className="m3-bare-input"
              placeholder="Type feature, press Enter…"
              value={customFeatureInput}
              onChange={(e) => setCustomFeatureInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customFeatureInput.trim()) {
                  dispatch({
                    type: 'ADD_FEATURE',
                    payload: { category: 'mustHave', feature: customFeatureInput.trim() },
                  });
                  setCustomFeatureInput('');
                }
              }}
            />
            <Btn
              variant="text"
              icon={Ico.plus}
              size="sm"
              onClick={() => {
                if (customFeatureInput.trim()) {
                  dispatch({
                    type: 'ADD_FEATURE',
                    payload: { category: 'mustHave', feature: customFeatureInput.trim() },
                  });
                  setCustomFeatureInput('');
                }
              }}
            >
              Add
            </Btn>
          </div>

          <div className="divider" />
          <div className="subhead">Product Paint</div>
          <div className="paint-row">
            <Segmented
              size="sm"
              value={paint.finish}
              onChange={(v) => setPaint({ finish: v as typeof paint.finish })}
              options={[
                { value: 'gloss', label: 'Gloss' },
                { value: 'satin', label: 'Satin' },
                { value: 'matte', label: 'Matte' },
                { value: 'textured', label: 'Textured' },
              ]}
            />
          </div>
          <div className="grid-2 paint-spaced">
            <TextField
              label="Color / RAL"
              value={paint.colors?.[0] ?? ''}
              onChange={(v) => dispatch({ type: 'TOGGLE_PAINT_COLOR', payload: v })}
              placeholder="e.g. Black, RAL 9005"
            />
            <TextField
              label="Notes"
              value={paint.description}
              onChange={(v) => setPaint({ description: v })}
              placeholder="Any paint notes…"
            />
          </div>
        </div>
      </section>

      {/* 06 Commercials */}
      <section>
        <SectionHeader number={6} title="Commercials" hint="MOQ and target price for unit economics." />
        <div className="card form-card">
          <div className="grid-2">
            <TextField
              label="MOQ"
              value={state.commercials.moq}
              onChange={(v) => dispatch({ type: 'SET_MOQ', payload: v })}
              placeholder="e.g., 1,000 units"
              icon={Ico.list}
            />
            <TextField
              label="Target Price"
              value={state.commercials.targetPrice}
              onChange={(v) => dispatch({ type: 'SET_TARGET_PRICE', payload: v })}
              placeholder="e.g., $50–100"
              icon={Ico.cash}
            />
          </div>
        </div>
      </section>

      {/* 07 Competitors */}
      <section>
        <SectionHeader
          number={7}
          title="Competitors"
          hint="Paste a URL — we'll scrape brand, name, and price."
        />
        <div className="card form-card form-card--tight">
          <div className="competitor-input-row">
            <div className="m3-field-input" style={{ flex: 1 }}>
              <span className="m3-field-icon">{Ico.link}</span>
              <input
                placeholder="https://competitor.com/product"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScrape();
                }}
              />
            </div>
            <Btn
              variant="tonal"
              icon={scrapingUrl ? undefined : Ico.scope}
              onClick={handleScrape}
              disabled={!!scrapingUrl || !competitorInput.trim()}
            >
              {scrapingUrl ? (
                <>
                  <span className="spinner" />
                  Scraping…
                </>
              ) : (
                'Scrape'
              )}
            </Btn>
          </div>

          <div className="competitor-list">
            {(state.competitors ?? []).map((c, i) => (
              <div key={i} className="competitor-row">
                <div className="competitor-thumb">
                  {c.photoUrls?.[0] ? (
                    <img
                      src={c.photoUrls[0]}
                      alt={c.productName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--a-r-s)' }}
                    />
                  ) : (
                    <svg viewBox="0 0 80 60">
                      <defs>
                        <pattern
                          id={`cp${i}`}
                          width="6"
                          height="6"
                          patternUnits="userSpaceOnUse"
                          patternTransform="rotate(45)"
                        >
                          <rect width="3" height="6" fill="currentColor" opacity="0.18" />
                        </pattern>
                      </defs>
                      <rect width="80" height="60" fill={`url(#cp${i})`} />
                    </svg>
                  )}
                </div>
                <div className="competitor-body">
                  <div className="competitor-brand">{c.brand || 'Brand'}</div>
                  <div className="competitor-name">{c.productName || c.url}</div>
                  <div className="competitor-meta">
                    {c.cost && <span>{c.cost}</span>}
                    {c.cost && <span className="dot-sep">·</span>}
                    <span>{c.url}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ background: 'none', cursor: 'pointer', color: 'var(--a-on-surface-muted)', border: '1.5px solid var(--a-outline)', borderRadius: 'var(--a-r-pill)', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  onClick={() => dispatch({ type: 'REMOVE_COMPETITOR', payload: c.url })}
                  title="Remove"
                >
                  {Ico.trash}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Finish note */}
      {computeCompletion(state) >= 70 && (
        <div className="form-section-last">
          <div className="finish-note">
            <span className="finish-note-icon">{Ico.check}</span>
            <div>
              <div className="finish-note-title">Looking good</div>
              <div className="finish-note-sub">
                Save a draft or publish to enable export.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Main orchestrator
────────────────────────────────────────── */
function OnePagerAlphaContent() {
  const { state, dispatch, reset } = useOnePager();
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [previewMode, setPreviewMode] = useState<'cards' | 'paper'>('cards');

  useEffect(() => {
    fetch('/api/one-pager/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(console.error);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const title = state.productName || 'Untitled One-Pager';
      if (!state.documentId) {
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, tool_type: 'one-pager', content_json: state }),
        });
        const data = await res.json();
        if (data.id) dispatch({ type: 'SET_DOCUMENT_ID', payload: data.id });
      } else {
        await fetch(`/api/documents/${state.documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentJson: state }),
        });
      }
    } catch {
      /* silent */
    } finally {
      setIsSaving(false);
    }
  }, [state, dispatch]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      let docId = state.documentId;
      if (!docId) {
        const title = state.productName || 'Untitled One-Pager';
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, tool_type: 'one-pager', content_json: state }),
        });
        const data = await res.json();
        if (data.id) {
          dispatch({ type: 'SET_DOCUMENT_ID', payload: data.id });
          docId = data.id;
        }
      }
      if (!docId) return;
      await fetch(`/api/documents/${docId}/publish`, { method: 'POST' });
      dispatch({ type: 'SET_PUBLISHED', payload: true });
    } catch {
      /* silent */
    } finally {
      setIsPublishing(false);
    }
  }, [state, dispatch]);

  const handleExport = useCallback(
    async (format: 'docx' | 'html' | 'pdf') => {
      setIsExporting(format);
      try {
        const res = await fetch(`/api/one-pager/export?format=${format}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...state, featureLayout: 'sideBySide' }),
        });
        if (format === 'pdf') {
          const data = await res.json();
          const w = window.open('', '_blank');
          if (w) {
            w.document.write(data.html);
            w.document.close();
            w.focus();
            setTimeout(() => w.print(), 500);
          }
        } else {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `one-pager-${Date.now()}.${format}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        }
      } catch {
        /* silent */
      } finally {
        setIsExporting(null);
      }
    },
    [state]
  );

  const handleAutoFill = useCallback(async () => {
    if (!config) return;
    setIsAutoFilling(true);
    try {
      const availableFeatures = config.standardFeatures.map((cat) => ({
        category: cat.label,
        features: cat.features.map((f: { label: string }) => f.label),
      }));
      const res = await fetch('/api/one-pager/suggest-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: state.description || state.expandedDescription,
          goal: state.goal || state.expandedGoal,
          useCases: state.useCases || state.expandedUseCases,
          availableFeatures,
        }),
      });
      const data = await res.json();
      if (data.mustHave || data.niceToHave) {
        dispatch({
          type: 'SET_FEATURES',
          payload: { mustHave: data.mustHave ?? [], niceToHave: data.niceToHave ?? [] },
        });
      }
    } catch {
      /* silent */
    } finally {
      setIsAutoFilling(false);
    }
  }, [config, state, dispatch]);

  const isWorking = !!isExporting || isSaving || isPublishing;

  const statusText = isSaving
    ? 'Saving…'
    : isPublishing
    ? 'Publishing…'
    : state.isPublished
    ? 'Published'
    : state.documentId
    ? 'Draft · saved'
    : 'Draft · unsaved';

  return (
    <div className="op-alpha">
      {/* Top app bar */}
      <header className="top-bar">
        <div className="top-bar-left">
          <img
            src="/compulocks-logo.svg"
            alt="Compulocks"
            className="top-bar-logo"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="top-bar-divider" />
          <span className="top-bar-product">
            <strong>MRD Producer</strong> · Marketing Requirement Document
          </span>
          <span className="top-bar-badge">Alpha</span>
        </div>
        <div className="top-bar-right">
          <Link href="/" className="icon-btn" title="Home" style={{ textDecoration: 'none' }}>
            {Ico.home}
          </Link>
          <button
            className="icon-btn"
            title="Reset form"
            onClick={() => {
              if (window.confirm('Reset the form? All unsaved data will be lost.')) reset();
            }}
          >
            {Ico.reset}
          </button>
        </div>
      </header>

      {/* Split body */}
      <div className="split">
        {/* Left — form */}
        <div className="left">
          <div className="left-scroll">
            <FormPanel
              config={config}
              isAutoFilling={isAutoFilling}
              onAutoFill={handleAutoFill}
            />
          </div>
          <div className="action-bar">
            <div className="action-bar-left">
              <span
                className={`status-pill ${state.isPublished ? 'status-pill--published' : 'status-pill--draft'}`}
              >
                <span className="status-dot" />
                {statusText}
              </span>
            </div>
            <div className="action-bar-right">
              <Btn
                variant="outlined"
                icon={Ico.save}
                onClick={handleSaveDraft}
                disabled={isWorking}
              >
                {isSaving ? 'Saving…' : 'Save Draft'}
              </Btn>
              {state.isPublished ? (
                <Btn
                  variant="outlined"
                  onClick={async () => {
                    if (!state.documentId) {
                      dispatch({ type: 'SET_PUBLISHED', payload: false });
                      return;
                    }
                    try {
                      await fetch(`/api/documents/${state.documentId}/publish`, { method: 'DELETE' });
                      dispatch({ type: 'SET_PUBLISHED', payload: false });
                    } catch {
                      dispatch({ type: 'SET_PUBLISHED', payload: false });
                    }
                  }}
                  disabled={isWorking}
                >
                  Unpublish
                </Btn>
              ) : (
                <Btn
                  variant="outlined"
                  icon={Ico.send}
                  onClick={handlePublish}
                  disabled={isWorking}
                >
                  {isPublishing ? 'Publishing…' : 'Publish'}
                </Btn>
              )}
              <Btn
                variant="ghost"
                icon={Ico.print}
                onClick={() => handleExport('pdf')}
                disabled={isWorking}
              >
                {isExporting === 'pdf' ? 'Preparing…' : 'Print / PDF'}
              </Btn>
              <Btn
                variant="accent"
                icon={Ico.download}
                onClick={() => handleExport('docx')}
                disabled={isWorking}
              >
                {isExporting === 'docx' ? 'Exporting…' : 'Download DOCX'}
              </Btn>
            </div>
          </div>
        </div>

        {/* Right — preview */}
        <div className="right">
          <PreviewPanel mode={previewMode} />
        </div>
      </div>
    </div>
  );
}

export default function OnePagerAlphaPage() {
  return (
    <OnePagerProvider>
      <OnePagerAlphaContent />
    </OnePagerProvider>
  );
}
