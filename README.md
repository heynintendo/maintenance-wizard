# Maintenance Wizard

Decision support for predictive and prescriptive maintenance of heavy rotating equipment on a steel Hot Strip Mill. Maintenance Wizard unifies condition monitoring data, equipment history, and maintenance knowledge behind a single operations console, then reasons over all of it to diagnose faults, anticipate failures, prioritize work across the plant, and recommend action. Every conclusion is cited back to the record, document, sensor window, or computation that produced it.

## Live at https://tatasteel.thefoyers.club

The system is deployed and running in production on a dedicated cloud server, behind automatic HTTPS, with live AI inference. Open the URL in a browser and use it now; no local setup is required. The headline walkthroughs are served instantly from a verified capture of real agent runs, and every other question is answered live, end to end, through the full agentic pipeline.

## What it is

A Hot Strip Mill rolls heated steel slabs into coiled strip on a continuous line that runs around the clock. The line depends on a handful of large rotating assets: finishing stand work roll bearings, main drive gearboxes, and down coiler mandrels. When one of these degrades unnoticed, the result is an unplanned stoppage that is expensive, disrupts downstream scheduling, and can be unsafe.

The signals needed to catch this early already exist, but they are scattered: vibration and temperature trends in one system, the fault catalog and standard operating procedures in another, spare parts lead times in a third, and years of judgment in handwritten logbooks. Pulling them together under time pressure is slow and inconsistent, and the reasoning behind a decision is rarely written down.

Maintenance Wizard consolidates these sources behind one console and adds an assistant that reasons over them. For any asset it can name the probable fault, find the likely root cause, estimate how long the asset can keep running, classify the risk, prioritize the work against the rest of the plant, and recommend immediate and longer term actions. It also watches the monitored assets on its own, raises alerts on genuine abnormalities, opens work orders, and records what it did. The system ships with a self contained synthetic dataset for a representative finishing area, so it runs end to end without a plant connection.

## Key capabilities

- **Operations dashboard.** A single view of plant status: KPI summary, a priority ranking of assets, active alerts, and a health grid coloured by risk band.
- **Equipment register.** A searchable catalogue of assets with criticality, spares availability, service hours, sensor channels, and trend charts on the detail page.
- **Agentic assistant.** A conversational assistant that routes a question to specialist reasoning steps, calls data and model tools, and returns a written answer with inline citations back to the records, documents, and computations behind each claim. The live reasoning trace is visible while the answer is being produced.
- **Maintenance reports.** On demand structured reports for an asset, covering current condition, probable fault, root cause, remaining useful life, risk and priority, and recommended actions.
- **Alerts and autonomous monitoring.** A proactive engine watches monitored assets, raises alerts on genuine anomalies or early warning trends, opens a ticket, runs a full diagnosis, and records the action.
- **Plant health rollup.** Per area health percentages derived from live asset priority, so supervisors can see at a glance which part of the line is dragging overall health down.
- **Work order tickets.** A ticket lifecycle with a timeline, attached analysis, and the ability to mention plant personnel inline in notes (for example `@[A. Bose]`), which renders as a chip and surfaces in a per user mentions view.
- **Digital logbook.** A combined record of human and autonomous maintenance entries, with machine written entries clearly distinguished from people.

## Architecture

Maintenance Wizard is retrieval augmented, agentic, and grounded. The core is a bounded ReAct style tool calling loop that plans a question, delegates to focused specialist agents, runs real tools, and synthesizes a final cited answer.

- **Bounded orchestration.** An orchestrator plans the question and decides depth, so trivial lookups stay shallow while analytical questions fan out to specialists. Every loop is iteration capped, so the agent reasons over multiple steps without ever spinning unbounded.
- **Specialist agents.** Five analysis roles (diagnostic, root cause, predictive, risk and priority, recommendation) each run their own bounded loop over a restricted tool allowlist, then return a compact finding. A reporting role synthesizes the final answer strictly from those findings, with inline citations and no invented facts.
- **Real machine learning.** Trained models, not prompts, do the quantitative work: multivariate anomaly detection on sensor windows, remaining useful life estimation from degradation trends against ISO 10816-3 thresholds, and a process defect classifier trained on real hot rolling data. Each model is exposed to the agent as a tool that reports why, not just what.
- **Grounded retrieval.** The manuals, procedures, failure reports, and fault catalog are chunked, embedded with a local sentence embedding model, retrieved by vector similarity, and re-ranked with a cross encoder, so answers are anchored to the most relevant passages.
- **Provenance throughout.** Every tool returns a typed result carrying its own source list. Provenance bubbles up from the tools that were actually called and is aggregated, deduplicated, and attached to the answer, so each statement is traceable.
- **Provider agnostic inference.** The LLM layer speaks to any OpenAI compatible chat and tool calling endpoint, configurable per tier through environment variables. Production runs DeepSeek V4 Flash; no code changes are needed to point it elsewhere.

## Production deployment

Maintenance Wizard is live on a dedicated cloud server with a managed application process, automatic TLS, and live inference.

- **Public URL.** https://tatasteel.thefoyers.club
- **Hosting.** A dedicated Hetzner Cloud VPS (CPX32: 4 vCPU, 8 GB RAM, 160 GB NVMe) running Ubuntu 24.04 LTS in the Falkenstein, Germany region.
- **Web and TLS.** A Caddy reverse proxy fronts the application on a single origin and terminates automatic HTTPS with Let's Encrypt certificates that renew on their own, serving over HTTP/2 and HTTP/3.
- **Application process.** FastAPI served by uvicorn, managed as a systemd service that starts on boot and restarts on failure. Boot persistence was verified across a full server reboot.
- **Live inference.** DeepSeek V4 Flash (model id `deepseek-v4-flash`) through the provider agnostic OpenAI compatible adapter (base URL `https://api.deepseek.com`), with tool calling verified end to end.
- **Response strategy.** A hybrid model. A curated set of demonstration queries is served instantly from a verified capture of real prior agent runs, and every other query is processed live, end to end. A complete multi specialist run typically takes about 40 to 60 seconds.
- **Resilience.** The per call LLM request timeout is 180 seconds (configurable via `LLM_REQUEST_TIMEOUT`), and the agent loop degrades gracefully to a partial result on a timeout or provider error rather than failing the request.

## Run it

There are three ways to use Maintenance Wizard.

### 1. Use the live site

Open https://tatasteel.thefoyers.club. Nothing to install. The full console is available, the curated demonstration queries reply instantly, and any other question is answered live.

### 2. Run locally in cached demo mode

Cached demo mode replays previously recorded assistant, report, and autonomous diagnosis outputs, so it is instant and needs no API key. Every other surface (dashboard, equipment, alerts, tickets, logbook, plant health) runs on the data and models you build locally.

First install dependencies and build the local data and models:

```bash
uv sync                                          # create the environment and install dependencies
uv run python -m backend.scripts.train_models    # train the anomaly and defect models
uv run python -m backend.scripts.build_index     # load SQLite and build the retrieval index
```

The synthetic source data lives under `data/raw` and is committed. The runtime database, vector index, and trained models are rebuilt from it by the two scripts above. The first index build downloads the local embedding model and caches it.

Then start the cached demo:

```bash
make demo-cached
# then open http://127.0.0.1:8000
```

### 3. Run locally in full live mode

Full live mode answers every query end to end through the agentic pipeline against a real model. Provide an API key for any OpenAI compatible endpoint:

```bash
cp .env.example .env
# set LLM_LARGE_API_KEY (and LLM_SMALL_API_KEY for the small tier too)
make demo
```

To reproduce the production configuration exactly, point the adapter at DeepSeek V4 Flash:

```bash
LLM_LARGE_PROVIDER=openai
LLM_LARGE_MODEL=deepseek-v4-flash
LLM_LARGE_BASE_URL=https://api.deepseek.com
LLM_LARGE_API_KEY=your-deepseek-key
```

Production combines both of the above: cached demo mode is enabled and a live key is configured, so the curated queries replay instantly while everything else is answered live. The per call timeout defaults to 180 seconds and is tunable with `LLM_REQUEST_TIMEOUT`.

### Develop

```bash
make dev   # backend on :8000 and the Vite dev server on :5173, together
```

### Test and check

```bash
make test                                         # backend test suite
cd frontend && npm run typecheck && npm run build # frontend checks
```

## Tech stack

- **Backend:** Python 3.11, FastAPI, Uvicorn, Pydantic, scikit-learn, pandas, NumPy, ChromaDB, fastembed, SQLite, Authlib.
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts.
- **Inference:** a provider agnostic OpenAI compatible adapter; DeepSeek V4 Flash in production.
- **Deployment:** Hetzner Cloud VPS, Ubuntu 24.04 LTS, Caddy with automatic HTTPS, uvicorn under systemd.
- **Tooling:** uv for environments and dependencies, pytest, Ruff, and npm.

## Configuration

All configuration is read from environment variables; see `.env.example` for the full set. The LLM client is tiered, with a small fast tier for routing and simple sub tasks and a large reasoning tier for diagnosis, planning, and reports. Each tier has its own provider, model, base URL, and API key, so the two tiers can use different endpoints. The per call request timeout is set by `LLM_REQUEST_TIMEOUT` (default 180 seconds). Optional Microsoft Entra ID single sign on is available through the OAuth authorization code flow; when it is not configured, the app uses a built in persona picker.

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

See [`PROJECT_DOCUMENTATION.md`](PROJECT_DOCUMENTATION.md) and the rendered [`PROJECT_DOCUMENTATION.pdf`](PROJECT_DOCUMENTATION.pdf) for the full system design and submission document: problem context, production deployment, architecture, technology stack, data and system flow, model design and reasoning pipeline, alerting logic, coverage of the required outputs, worked examples, installation, and limitations.

See [`docs/architecture.md`](docs/architecture.md) for the layered architecture, data flow, and the reasoning pipeline, and [`docs/adr/`](docs/adr/) for the design decisions behind the data substrate, retrieval, ML layer, agent core, and the frontend.
