# AI-Powered DocDiff

AI-Powered DocDiff is a document regression analysis tool for comparing **old vs new PDF outputs** and classifying differences into:

- **Expected** (safe/intentional)
- **Uncertain** (needs review)
- **Likely Defect** (high-risk/unexpected)

It supports both:
- **Single-file comparison** (one old + one new PDF)
- **Batch directory comparison** (folder-to-folder matching and processing)

The app combines deterministic diffing with AI reasoning, optional memory-based reuse of prior reviewer decisions, and optional rulebook retrieval from a FastAPI sidecar.

---

## Architecture at a Glance

### Frontend (React + Vite)
The frontend:
1. Parses PDFs (`pdf.js` locally, optional backend parsing supported by parser service config)
2. Normalizes extracted structure
3. Computes diffs
4. Runs AI analysis per diff (LLM or mock mode)
5. Allows reviewer decision and exports reports

Key flows are implemented in `src/App.jsx` and supporting services/components. 

### Backend (FastAPI)
The backend provides:
- `/parse` for Docling-based PDF conversion
- `/advisory/*` for rulebook upload/list/retrieve/clear operations (RAG helper)

---

## Repository Structure

```text
.
├── src/
│   ├── components/        # UI (upload, summary, review, settings, etc.)
│   ├── services/          # parsing, diffing, AI, memory, advisory client, batch pipeline
│   └── App.jsx            # app orchestration and view state
├── backend/
│   ├── main.py            # FastAPI server, /parse endpoint
│   ├── advisory_routes.py # /advisory routes
│   ├── compliance_rag.py  # rulebook ingestion/query/clear logic
│   └── requirements.txt   # backend dependencies
└── README.md
```

---

## Features

- **Single PDF regression comparison**
- **Batch mode** with file matching and per-file status summary
- **AI analysis modes**:
  - Mock mode (no API key)
  - Real provider mode via settings
- **Memory learning**: reviewer-accepted patterns can be reused for future similar diffs
- **Rulebook retrieval (RAG sidecar)** to enrich AI context for compliance-oriented decisions
- **Export** of comparison/batch results as JSON

---

## Prerequisites

- Node.js 18+ (recommended)
- npm
- Python 3.10+
- pip

---

## Quick Start

### 1) Frontend setup

```bash
npm install
npm run dev
```

Frontend runs on Vite default URL (typically `http://localhost:5173`).

### 2) Backend setup (optional but recommended)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend default URL: `http://localhost:8000`

> If backend is not running, some advisory/rulebook features will be unavailable, and local PDF parsing is used by default unless configured otherwise in parser settings.

---

## How to Use

1. Open the app.
2. Click **Settings** and configure AI provider/API key (or leave blank for mock mode).
3. Choose mode:
   - **Single File**: upload old and new PDFs.
   - **Directory**: upload old/new folders and run batch processing.
4. Review generated summary.
5. Inspect individual differences and mark decisions.
6. Export report JSON.

---

## Backend API Overview

### Core parse endpoint
- `POST /parse`
  - multipart form:
    - `file` (PDF)
    - `output_format` (default: `markdown`)
  - Returns converted content plus structure payload.

### Advisory endpoints
- `GET /advisory/rules` — list indexed rulebooks
- `POST /advisory/upload` — upload and index a rulebook PDF
- `POST /advisory/retrieve` — retrieve relevant rules for a `diff_text`
- `DELETE /advisory/clear` — clear indexed rulebooks

---

## Scripts

### Frontend
```bash
npm run dev      # start Vite dev server
npm run build    # production build
npm run preview  # preview production build
npm run lint     # run ESLint
```

### Backend tests
```bash
pytest backend/test_server.py backend/test_retrieve.py -q
```

---

## Notes & Limitations

- Current repository includes existing lint debt in areas outside documentation updates.
- Some backend capabilities depend on optional heavy ML/runtime dependencies.
- Rule retrieval quality depends on rulebook coverage and embedding/search behavior.

---

## Future Improvements

- Add typed API contracts for frontend/backend integration
- Add more robust automated tests (unit + integration)
- Harden error handling and retries in network-bound flows
- Add richer report format (CSV/PDF dashboards)

---

## License

No license file is currently defined in this repository.
