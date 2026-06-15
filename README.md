# Maintenance Wizard

Decision-support for predictive and prescriptive maintenance of heavy rotating equipment on a steel Hot Strip Mill. Maintenance Wizard brings condition-monitoring data, equipment history, and maintenance knowledge together behind a single operations console, then helps engineers diagnose faults, anticipate failures, prioritize work, and act on cited, traceable recommendations.

## Overview

A Hot Strip Mill runs around the clock, and unplanned stoppages on critical assets such as work-roll bearings, main-drive gearboxes, and coiler mandrels are expensive and can be unsafe. Maintenance teams have to weigh vibration and temperature trends, fault catalogs, standard operating procedures, spare-parts lead times, and years of logbook history, often under time pressure. Maintenance Wizard consolidates those signals and adds an assistant that reasons over them and explains how it reached each conclusion, so the path from a raw sensor anomaly to a prioritized work order is short and auditable.

The system ships with a self-contained synthetic dataset for a representative finishing area, so it runs end to end on a laptop without any plant connection.

## Key capabilities

- **Operations dashboard.** A single view of plant status: KPI summary, a priority ranking of assets, active alerts, and a health grid coloured by risk band.
- **Equipment register.** A searchable catalogue of assets with criticality, spares availability, service hours, sensor channels, and trend charts on the detail page.
- **Alerts and autonomous monitoring.** A proactive engine watches monitored assets, raises alerts on genuine anomalies or early-warning trends, opens a ticket, and records the action.
- **Plant-health rollup.** Per-area health percentages derived from live asset priority, so supervisors can see at a glance which part of the line is dragging overall health down.
- **Agentic assistant.** A conversational assistant that routes a question to specialist reasoning steps, calls data and model tools, and returns a written answer with inline citations back to the records, documents, and computations behind each claim. The live reasoning trace is visible while the answer is being produced.
- **Maintenance reports.** On-demand structured reports for an asset, covering current condition, probable fault, root cause, remaining useful life, risk and priority, and recommended actions.
- **Work-order tickets.** A lightweight ticket lifecycle with a timeline, attached analysis, and the ability to mention plant personnel inline in notes (for example `@[A. Bose]`), which renders as a chip and surfaces in a per-user mentions view.
- **Digital logbook.** A combined record of human and autonomous maintenance entries, clearly distinguishing machine-written entries from people.

## How it works

- **Data layer.** A deterministic synthetic substrate models the assets, sensor histories, fault catalog, maintenance records, spares, and a small corpus of manuals, procedures, and failure reports. It is generated from a single specification and validated for internal consistency.
- **Retrieval.** The document corpus is embedded with a local sentence-embedding model and indexed in a vector store. Queries are retrieved by vector similarity and then re-ranked with a cross-encoder, so the assistant grounds its answers in the most relevant passages.
- **Machine learning.** Trained models provide multivariate anomaly detection on sensor windows, remaining-useful-life estimation from degradation trends, and a process-defect classifier. Their outputs feed both the dashboards and the assistant as tools.
- **Agent orchestrator.** A bounded, multi-specialist orchestration loop plans a question, delegates to focused specialists (diagnosis, root cause, prediction, risk and priority, recommendation), runs tools, and composes a final answer. Iteration is capped and every step is recorded.
- **Provenance and citations.** Tool results carry source references that are aggregated into the final answer, so each statement can be traced to a record, a document section, a sensor window, or a computation.
- **Backend.** A FastAPI service exposes the dashboards, equipment data, alerts, tickets, logbook, reports, and a streaming chat endpoint. Server-sent events stream the agent trace to the browser.
- **Frontend.** A React and TypeScript single-page application built with Vite and Tailwind CSS presents the console and renders the live trace and cited outputs.

The LLM layer is provider-agnostic. It speaks to any OpenAI-compatible chat and tool-calling endpoint, configurable per provider and per model tier through environment variables, so you can point it at the endpoint of your choice without code changes.

## Tech stack

- **Backend:** Python 3.11, FastAPI, Uvicorn, Pydantic, scikit-learn, pandas, NumPy, ChromaDB, fastembed, SQLite, Authlib.
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts.
- **Tooling:** uv for environments and dependencies, pytest, Ruff, and npm.

## Getting started

### Prerequisites

- Python 3.11 or newer and [uv](https://docs.astral.sh/uv/)
- Node.js 18 or newer and npm

### Install and build the local data and models

```bash
uv sync                                          # create the environment and install dependencies
uv run python -m backend.scripts.train_models    # train the anomaly and defect models
uv run python -m backend.scripts.build_index     # load SQLite and build the retrieval index
```

The synthetic source data lives under `data/raw` and is committed. The runtime database, vector index, and trained models are rebuilt from it by the two scripts above. The first index build downloads the local embedding model and caches it.

### Run the cached demo

The cached demo replays previously recorded assistant, report, and autonomous-diagnosis outputs, so it is instant and needs no API key. All other surfaces (dashboard, equipment, alerts, tickets, logbook, plant health) run on the data and models you just built.

```bash
make demo-cached
# then open http://127.0.0.1:8000
```

### Run live

To exercise the agent against a real model, provide an API key for an OpenAI-compatible endpoint:

```bash
cp .env.example .env
# set LLM_LARGE_API_KEY (and LLM_SMALL_API_KEY if you want the small tier live too)
make demo
```

### Develop

```bash
make dev   # backend on :8000 and the Vite dev server on :5173, together
```

### Test and check

```bash
make test                                         # backend test suite
cd frontend && npm run typecheck && npm run build # frontend checks
```

## Configuration

All configuration is read from environment variables; see `.env.example` for the full set. The LLM client is tiered, with a small or fast tier for routing and simple sub-tasks and a large or reasoning tier for diagnosis, planning, and reports. Each tier has its own provider, model, and API key, so the two tiers can use different endpoints. Optional Microsoft Entra ID single sign-on is available through the OAuth authorization-code flow; when it is not configured, the app uses a built-in persona picker.

## Project structure

```
backend/
  app/
    agents/        bounded orchestration loop, specialists, prompts, provenance
    ml/            anomaly detection, remaining useful life, defect, risk, early warning
    retrieval/     chunking, embeddings, reranker, vector store, retriever
    tools/         tool abstraction and the maintenance tool suite
    llm/           provider-agnostic tiered LLM client and adapters
    data_access/   SQLite loader, repositories, sensor reader
    proactive/     autonomous monitoring engine and sensor stream
    tickets/       ticket and alert services, stores, presentation
    api/           FastAPI routers and the server-sent-events bridge
    core/          configuration, logging, channel labels
  scripts/         data substrate, model training, index build, demo capture
  demo_cache/      recorded payloads for the cached demo
  tests/           unit and integration tests
data/raw/          committed synthetic source data (CSVs, sensor parquet, documents)
docs/              architecture overview and decision records
frontend/src/      React SPA: pages, components, hooks, lib, auth
```

## Documentation

See [`docs/DESIGN.md`](docs/DESIGN.md) for the full system design and submission document: problem context, architecture, technology stack, data and system flow, model design and reasoning pipeline, alerting logic, coverage of the required outputs, worked examples, installation, and limitations.

See [`docs/architecture.md`](docs/architecture.md) for the layered architecture, data flow, and the reasoning pipeline, and [`docs/adr/`](docs/adr/) for the design decisions behind the data substrate, retrieval, ML layer, agent core, and the frontend.
