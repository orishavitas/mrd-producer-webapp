# Reference Library

This directory contains prompt templates and specifications for the multi-stage MRD generation pipeline.

## Pipeline Overview

The MRD generation follows a 4-stage pipeline:

| Stage | File | Purpose |
|-------|------|---------|
| 1 | `01_parse_request.md` | Parse raw product requests into structured JSON |
| 2 | `02_gap_analysis.md` | Analyze information gaps and generate clarification questions |
| 3 | `03_research.md` | Conduct competitive research using web search |
| 4 | `04_generate_mrd.md` | Generate complete MRD following 12-section template |

## Additional Resources

- `mrd-template-reference.md` - Document formatting specifications (typography, spacing, styling)

## Usage

Each file contains:
- Chain position and dependencies
- Input/output schemas
- Detailed instructions for AI prompts
- Example outputs
- Verification checklists

See `docs/REFERENCE_LIBRARY_REVIEW.md` for detailed analysis and implementation roadmap.
