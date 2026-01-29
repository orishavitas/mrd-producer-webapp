# MRD Producer Web App

An AI-powered web application that automates the creation of Market Research Documents (MRDs). It takes a product concept, identifies information gaps, conducts web research, and generates a comprehensive market report.

## Features

- **Smart Intake**: Accepts product concepts and target market details.
- **Interactive Agent**: Asks clarifying questions to refine the research scope.
- **Automated Research**: Performs deep web searches to gather market data and competitor insights.
- **MRD Generation**: Synthesizes findings into a structured, professional Market Research Document.

## Architecture

Built with **Next.js** (App Router), following an AgentOS-inspired structure:
- `agent/`: Core workflow logic and state machine.
- `skills/`: Pluggable capabilities (Web Search, Text Generation).
- `app/`: Frontend UI and API endpoints.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Open Browser**:
    Navigate to [http://localhost:3000](http://localhost:3000).

## Documentation

-   [Product Requirements Document (PRD)](docs/PRD.md)
-   [Design Guide & Agent Rules](docs/DESIGN_GUIDE.md)
