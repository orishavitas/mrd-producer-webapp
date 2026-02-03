# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-03

### Added
- Document download functionality (Word, PDF, HTML formats)
- Professional document styling following MRD template specs
- `/api/download` endpoint for document conversion
- Download buttons in UI (Word, Print/PDF, HTML)
- Research sources display in UI
- Gemini Google Search grounding for real-time web research
- 12-section MRD structure following Compulocks template

### Changed
- Migrated from `@google/generative-ai` to `@google/genai` SDK
- Replaced Google Custom Search API with Gemini Search grounding
- Updated default model to `gemini-2.5-flash`
- MRD generator now follows exact 12-section template structure
- Only `GOOGLE_API_KEY` required (removed `GOOGLE_SEARCH_ENGINE_ID` dependency)

### Document Features
- US Letter size (8.5" x 11") with 1" margins
- Arial font with proper heading hierarchy (20pt/16pt/13pt/11pt)
- Bullet lists, horizontal rules between sections
- Headers with document title, footers with page numbers
- Print-ready HTML styling for PDF export

## [0.2.0] - 2026-02-03

### Added
- Multi-stage MRD generation pipeline with 5 stages (Parse, Gap Analysis, Clarify, Research, Generate)
- Input sanitization (`lib/sanitize.ts`) to prevent prompt injection attacks
- Gap analyzer skill with question generation (max 2 rounds, 5 questions per round)
- New `/api/workflow` endpoint for stateful MRD generation
- Jest testing infrastructure with 65 tests
- Data schemas for all pipeline stages (`lib/schemas.ts`)
- `references/README.md` documentation

### Changed
- Renamed `refrances/` directory to `references/`
- Fixed duplicate files and chain position comments in reference docs
- Updated `/api/generate` to use input sanitization

### Removed
- Duplicate `05_generate_mrd.md` file

## [0.1.0] - 2026-02-02

### Added
- Initial Next.js 14 web application
- Cross-browser compatibility support (Chrome 60+, Firefox 60+, Safari 12+, Edge 79+)
- Google Gemini Pro integration for AI-powered MRD generation
- Google Custom Search API integration for market research
- Basic form UI for product concept and target market input
- Template-based MRD fallback when AI unavailable
- CI/CD pipeline with GitHub Actions and Vercel deployment
