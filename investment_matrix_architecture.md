# Architecture & Privacy Protocol

This document outlines the localized infrastructure, network security topology, and private LLM orchestration parameters implemented in the Investment Matrix platform.

---

## 1. Network Topology & Container Isolation

To maintain complete data privacy and prevent local execution telemetry leaks, the Docker Compose environment is configured with strict network partitioning:

```
                  [ PUBLIC INTERNET ]
                           │ (Inbound ports 80/443 only)
                           ▼
                 [ Next.js Frontend ]
                           │ (Inside Frontend Network)
                           ▼
                  [ FastAPI Backend ]
                           │
      ┌────────────────────┴────────────────────┐
      │ (Backend Network)                       │ (Private DB Network)
      ▼                                         ▼
[ Ollama Container ]                   [ TimescaleDB / Redis ]
(No Internet Access)                   (No Internet Access)
```

### A. Network Segregation
The application operates on three isolated, non-overlapping virtual bridges:
1. **`frontend-net`**: Connects the user's browser (external client) to the Next.js standalone container.
2. **`backend-net`**: Links the Next.js frontend to the FastAPI server.
3. **`db-net`**: Connects the FastAPI backend, Celery workers, Redis, and TimescaleDB containers. The database and cache containers do not expose ports to the host system and have no route to the public internet.
4. **`inference-net`**: Connects the FastAPI server and Celery workers to the Ollama container. The Ollama container has external routing disabled, preventing any outbound connections.

### B. Host Binding Restrictions
- Databases, caches, and raw inference sockets bind strictly to internal bridge addresses (e.g., `127.0.0.1` or the Docker bridge IP).
- External administration tools (like pgAdmin or Redis Insight) can only interface with these services via secure SSH tunnels.

---

## 2. Local LLM Orchestration & Integration

The platform orchestrates local LLM execution via the [`crew_models.py`](file:///c:/Users/milli/millionaire_miller_investments/investment_matrix/app/services/crew_models.py) and [`crew_autonomy.py`](file:///c:/Users/milli/millionaire_miller_investments/investment_matrix/app/services/crew_autonomy.py) services.

### A. Model Routing & Role Definition
The system supports specific models assigned to specialized quantitative roles, governed by the [`AgentGuardrailProfile`](file:///c:/Users/milli/millionaire_miller_investments/investment_matrix/app/models/research.py). If a specific model is not configured or downloaded, the system falls back to the default model:

- **Global Default** (`default_llm_model`): `llama3.1:8b` (General coordination)
- **Market Research** (`research_llm_model`): `llama3.1:8b` (Snapshot evaluation)
- **Thesis Strategist** (`thesis_llm_model`): `llama3.1:8b` or `qwen2.5:14b` (Generating trading hypotheses)
- **Risk Review** (`risk_llm_model`): `llama3.1:8b` (Evaluating exposure and stop-loss bounds)
- **Trade Decision** (`trade_llm_model`): `llama3.1:8b` (Executing order signals)

### B. Structured JSON Contracts
To guarantee deterministic execution, all model queries require structural JSON outputs. Ollama's native JSON mode is enforced:
- **API Call**: Invokes `/api/generate` with the `"format": "json"` payload.
- **Model Temp**: Set to `temperature: 0.1` to reduce creative variance and force structured reasoning based on technical indicators.
- **Sanitization pipeline ([`_sanitize_llm_json`](file:///c:/Users/milli/millionaire_miller_investments/investment_matrix/app/services/crew_models.py#L17-L53))**:
  - Drops markdown code fences (e.g., ` ```json `).
  - Scrubs inline JSON comments (`//`).
  - Truncates pre/post prose by locating the outer `{` and `}` braces.
- **Validation Retry Loop**: If Pydantic fails validation against the [`ThesisDecision`](file:///c:/Users/milli/millionaire_miller_investments/investment_matrix/app/services/crew_autonomy.py#L72-L117) schema, a retry request is triggered, appending the validation traceback to the prompt context.

### C. Hardware Optimization
To support low-latency inference on consumer-grade hardware:
- **GPU Passthrough**: The Docker service maps NVIDIA GPUs via the `nvidia-container-toolkit` driver, enabling full CUDA/ROCm execution.
- **Context Length Optimization**: Prompts are constrained to keep input context under 8,192 tokens by pre-aggregating candlestick features and truncating historic lessons context.
- **Concurrent Request Throttle**: Celery worker pools are configured with `concurrency=1` for LLM tasks to prevent memory fragmentation and CUDA out-of-memory (OOM) errors.

---

## 3. Zero-Cloud Security Posture

Unlike commercial quantitative dashboards that rely on SaaS integrations, the Investment Matrix platform enforces a strict **Zero-Cloud Dependency Policy**:

- **No API Keys for Inference**: No configuration profiles exist for OpenAI, Anthropic, or Cohere. This prevents leakage of order volumes, tickers, wallet addresses, and capital balances.
- **Local Logs & Audits**: Execution traces and agent transcripts are saved to local database tables ([`AgentModelInvocation`](file:///c:/Users/milli/millionaire_miller_investments/investment_matrix/app/models/research.py) and [`AgentLesson`](file:///c:/Users/milli/millionaire_miller_investments/investment_matrix/app/models/research.py)).
- **Telemetry Isolation**: Model usage metrics (latency, token count, prompt length) are stored locally in the TimescaleDB database rather than being reported to external telemetry servers.
