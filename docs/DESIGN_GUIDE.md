# Design Guide & Agent Behavior Rules

## 1. Architecture Overview

The application is built using the **AgentOS** pattern within a **Next.js** framework. It separates the "Brain" (Agent) from the "Body" (Skills) and the "Face" (UI).

### Directory Structure
-   `app/`: Frontend pages and API routes (The Interface).
-   `agent/`: The orchestration logic and workflow state machine (The Brain).
-   `skills/`: Atomic capabilities like searching or generating text (The Body).
-   `components/`: Reusable React UI components.
-   `lib/`: Shared utilities and types.

## 2. Agent Behavior Rules

The Agent is responsible for driving the MRD generation process. It must adhere to the following behavioral rules:

### 2.1. Gap Analysis & Clarification
-   **Goal**: Never assume; ask.
-   **Rule**: Before researching, the agent MUST analyze the user's input for vagueness.
-   **Behavior**: If the Target Market is "everyone", the agent MUST ask "Who is the specific primary user persona?".
-   **Limit**: Ask a maximum of 3-5 clarification questions to avoid user fatigue.

### 2.2. Research Strategy
-   **Goal**: Fact-based grounding.
-   **Rule**: All claims in the MRD regarding market size, competitors, or trends must be backed by search results.
-   **Behavior**:
    -   Step 1: Broad search for market overview.
    -   Step 2: Specific search for competitors named by user or found in Step 1.
    -   Step 3: Validation search for specific feature comparisons.

### 2.3. MRD Generation
-   **Goal**: Actionable insights.
-   **Rule**: The MRD should not just be a summary of links. It must synthesize information.
-   **Format**:
    -   **Executive Summary**: High-level verdict (Go/No-Go recommendation).
    -   **Market Analysis**: Size, TAM/SAM/SOM, Trends.
    -   **Competitive Landscape**: Direct and Indirect competitors.
    -   **Product Strategy**: Recommended positioning and feature set.

## 3. UI/UX Guidelines

### 3.1. Tone and Voice
-   **Professional**: The UI copy should be clean, objective, and business-focused.
-   **Helpful**: Error messages and empty states should guide the user on what to do next.

### 3.2. Visual Style
-   **Minimalist**: Use whitespace effectively to make reading long reports easy.
-   **Status Visibility**: Always show the current state of the request (e.g., "Agent is thinking...", "Waiting for your reply").

## 4. Technical Constraints & Patterns

-   **State Management**: Use a simple state machine pattern for the request lifecycle (`DRAFT` -> `ANALYZING` -> `WAITING_FOR_INPUT` -> `RESEARCHING` -> `COMPLETED`).
-   **Async Operations**: Research takes time. The UI should poll for updates or use server-sent events (if implemented), but for MVP, polling the status endpoint is acceptable.
-   **Skill Isolation**: Skills should be pure functions where possible, taking inputs and returning outputs without side effects on the global state.
