"""Demo cache: replay REAL captured agent outputs instantly for recordings.

A ``CachedOrchestrator`` wraps the real orchestrator. In demo mode it serves pre-captured
hero outputs (assistant chat, reports, autonomous diagnosis) through the SAME
``run`` / ``run_streaming`` interface, fast-replaying the captured status / tool_start /
tool_end trace before the final cited answer so it still looks like live reasoning but
completes in a couple of seconds. The outputs are genuine system captures produced by the
real agent (see ``backend/scripts/capture_demo_cache.py``), replayed for speed -- not
fabricated. Cache misses delegate to the live orchestrator.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

from backend.app.agents.contracts import OrchestratorResult
from backend.app.agents.events import emit, event_sink
from backend.app.core.logging import get_logger

log = get_logger(__name__)

_ASSET = re.compile(r"\b(HSM-[A-Z0-9]+(?:-[A-Z0-9]+)*)\b")


def normalize_key(query: str) -> str:
    """Tolerant chat key: lowercased, with ALL punctuation removed (only letters, digits and
    spaces kept) and internal whitespace collapsed, so a lightly reworded question on camera
    (a dropped comma, a missing apostrophe, extra spaces, different case) still hits the cache."""

    kept = "".join(ch for ch in query.lower() if ch.isalnum() or ch.isspace())
    return " ".join(kept.split())


def derive_key(query: str) -> str:
    """Stable cache key for a query. Reports and autonomous-alert queries are keyed by the
    asset id (their templates carry a varying timestamp); everything else is a chat key."""

    q = " ".join(query.split())
    low = q.lower()
    asset = _ASSET.search(q)
    if low.startswith("autonomous alert") and asset:
        return f"proactive:{asset.group(1)}"
    if low.startswith("generate a structured maintenance report for") and asset:
        return f"report:{asset.group(1)}"
    return f"chat:{normalize_key(q)}"


def load_demo_cache(cache_dir: str | Path) -> dict[str, dict]:
    """Load every entry under cache_dir (recursively), indexed by the key RE-DERIVED from its
    stored ``query`` -- so the exact same ``derive_key``/``normalize_key`` used at lookup time
    decides the index. (Entries also persist a ``key`` field, but it may have been written under
    an older normalization; re-deriving keeps existing entries resolving after a normalizer
    change. The stored ``key`` is only a fallback for any entry without a ``query``.)"""

    cache: dict[str, dict] = {}
    base = Path(cache_dir)
    if not base.exists():
        return cache
    for path in sorted(base.rglob("*.json")):
        try:
            entry = json.loads(path.read_text())
        except Exception as exc:  # noqa: BLE001 -- a bad cache file must not break startup
            log.warning("demo_cache_load_failed", path=str(path), error=str(exc))
            continue
        query = entry.get("query")
        key = derive_key(query) if query else entry.get("key")
        if key:
            cache[key] = entry
    log.info("demo_cache_loaded", entries=len(cache))
    return cache


def _result(entry: dict, session_id: str) -> OrchestratorResult:
    final = dict(entry.get("final") or {})
    final["session_id"] = session_id
    return OrchestratorResult(**final)


class CachedOrchestrator:
    """Wraps the real orchestrator; serves captured outputs in demo mode, misses go live."""

    def __init__(self, inner: Any, cache: dict[str, dict], delay_ms: int = 250) -> None:
        self.inner = inner
        self.cache = cache
        self.delay = max(0, delay_ms) / 1000.0

    def run(self, query: str, session_id: str = "default") -> OrchestratorResult:
        entry = self.cache.get(derive_key(query))
        if entry is None:
            log.info("demo_cache_miss", key=derive_key(query))
            return self.inner.run(query, session_id)
        # Replay the trace only when a stream sink is active (the proactive poll/stream
        # path); a plain report request has no sink, so this returns instantly.
        if event_sink.get() is not None:
            self._replay(entry.get("events", []), emit)
        return _result(entry, session_id)

    def run_streaming(self, query: str, session_id: str, emit_fn: Any) -> OrchestratorResult:
        entry = self.cache.get(derive_key(query))
        if entry is None:
            log.info("demo_cache_miss", key=derive_key(query))
            return self.inner.run_streaming(query, session_id, emit_fn)

        def tagged(event: dict) -> None:
            event.setdefault("session_id", session_id)
            emit_fn(event)

        self._replay(entry.get("events", []), tagged)
        result = _result(entry, session_id)
        tagged({"type": "final", **result.to_dict()})
        return result

    def _replay(self, events: list[dict], sink: Any) -> None:
        for event in events:
            if event.get("type") == "final":
                continue  # the final is emitted separately from the captured result
            sink({k: v for k, v in event.items() if k != "session_id"})
            if self.delay:
                time.sleep(self.delay)
