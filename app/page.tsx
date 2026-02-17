'use client';

import Link from 'next/link';
import './landing.css';

interface FeatureCard {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  status: 'complete' | 'beta' | 'alpha';
  features: string[];
  bgColor: string;
}

const FEATURES: FeatureCard[] = [
  {
    title: 'MRD Chat Generator',
    subtitle: '12-Section MRD from Concept',
    description: 'Conversational MRD creation with batch extraction and live preview',
    href: '/mrd-generator',
    status: 'complete',
    features: [
      'Single AI call for all 12 sections',
      'Chat-based refinement',
      'Live markdown preview',
      'DOCX export with template compliance',
    ],
    bgColor: '#4f46e5',
  },
  {
    title: 'Product Brief',
    subtitle: 'Split-Screen Brief Builder',
    description: 'Interactive product brief with collapsible fields and live document preview',
    href: '/product-brief',
    status: 'complete',
    features: [
      'Collapsible field cards',
      'AI-powered gap detection',
      'Competition research integration',
      'Live document preview',
    ],
    bgColor: '#8b5cf6',
  },
  {
    title: 'Brief Helper',
    subtitle: '6-Field Quick Briefs',
    description: 'Fast product brief capture with AI-powered gap detection',
    href: '/brief-helper/start',
    status: 'beta',
    features: [
      'What/Who/Where/MOQ/Must-Haves/Nice-to-Haves',
      'AI text extraction',
      'Gap detection with suggestions',
      'Simplified DOCX export',
    ],
    bgColor: '#0891b2',
  },
  {
    title: 'Main MRD Producer',
    subtitle: 'Full Research + MRD',
    description: 'Classic MRD generation with Gemini-powered Google Search grounding',
    href: '/mrd-classic',
    status: 'complete',
    features: [
      'AI-powered competitive research',
      'Market trend analysis',
      'Full 12-section MRD',
      'Word/HTML/PDF export',
    ],
    bgColor: '#059669',
  },
  {
    title: 'Progressive Intake',
    subtitle: '4-Topic Structured Flow',
    description: 'Sequential topic approval with live research preview',
    href: '/intake',
    status: 'alpha',
    features: [
      'Guided 4-topic workflow',
      'Real-time research',
      'Topic-by-topic approval',
      'Stand/enclosure focus',
    ],
    bgColor: '#dc2626',
  },
];

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  complete: { label: 'Production Ready', color: '#10b981' },
  beta: { label: 'Beta', color: '#f59e0b' },
  alpha: { label: 'Alpha', color: '#ef4444' },
};

export default function LandingPage() {
  return (
    <main className="landing-page">
      <div className="landing-container">
        <header className="landing-hero">
          <div className="hero-badge">AI-Powered Product Documentation</div>
          <h1 className="hero-title">MRD Producer Suite</h1>
          <p className="hero-subtitle">
            Four specialized tools for creating Market Requirements Documents,
            product briefs, and structured intake flows—powered by AI research
            and Gemini's Google Search grounding.
          </p>
        </header>

        <div className="features-grid">
          {FEATURES.map((feature) => (
            <Link href={feature.href} key={feature.title} className="feature-card-link">
              <div
                className="feature-card"
                style={{
                  '--card-bg': feature.bgColor,
                } as React.CSSProperties}
              >
                <div className="feature-header">
                  <div>
                    <h2 className="feature-title">{feature.title}</h2>
                    <p className="feature-subtitle">{feature.subtitle}</p>
                  </div>
                  <div
                    className="feature-status"
                    style={{
                      backgroundColor: STATUS_BADGES[feature.status].color,
                    }}
                  >
                    {STATUS_BADGES[feature.status].label}
                  </div>
                </div>

                <p className="feature-description">{feature.description}</p>

                <ul className="feature-list">
                  {feature.features.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>

                <div className="feature-cta">
                  <span>Launch Tool</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 12L10 8L6 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <footer className="landing-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h3>About</h3>
              <p>
                MRD Producer Suite provides AI-powered tools for product managers,
                designers, and engineers to create comprehensive market requirements
                documents with automated research and competitive analysis.
              </p>
            </div>
            <div className="footer-section">
              <h3>Features</h3>
              <ul>
                <li>AI-powered research via Gemini</li>
                <li>Google Search grounding</li>
                <li>Multi-provider fallback (Claude, GPT)</li>
                <li>Template-compliant DOCX export</li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Documentation</h3>
              <p>
                Built on Next.js with a multi-agent architecture. Provider
                abstraction enables automatic fallback across Gemini, Anthropic
                Claude, and OpenAI GPT.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
