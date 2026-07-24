import os
import json
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone

PROJECT_ROOT = Path(__file__).parent.parent.absolute()
MLRUNS_DIR = PROJECT_ROOT / "mlruns"

class LightweightRun:
    def __init__(self, run_id, experiment_name="prompt-ab-scorer"):
        self.run_id = run_id
        self.experiment_name = experiment_name
        self.start_time = datetime.now(timezone.utc).isoformat()
        self.end_time = None
        self.params = {}
        self.metrics = {}
        self.status = "RUNNING"

    def log_param(self, key, val):
        self.params[str(key)] = str(val)

    def log_metric(self, key, val):
        try:
            self.metrics[str(key)] = float(val)
        except Exception:
            self.metrics[str(key)] = str(val)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = datetime.now(timezone.utc).isoformat()
        self.status = "FINISHED" if exc_type is None else "FAILED"
        self._save_run()

    def _save_run(self):
        MLRUNS_DIR.mkdir(parents=True, exist_ok=True)
        run_file = MLRUNS_DIR / f"run_{self.run_id}.json"
        data = {
            "run_id": self.run_id,
            "experiment_name": self.experiment_name,
            "status": self.status,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "params": self.params,
            "metrics": self.metrics,
        }
        with open(run_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)


def get_or_create_runs():
    """Retrieve all logged runs from MLRUNS_DIR."""
    MLRUNS_DIR.mkdir(parents=True, exist_ok=True)
    runs = []
    for p in MLRUNS_DIR.glob("run_*.json"):
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                run_entry = {
                    "run_id": data.get("run_id", p.stem.replace("run_", "")),
                    "status": data.get("status", "FINISHED"),
                    "start_time": data.get("start_time", ""),
                    "end_time": data.get("end_time", ""),
                }
                for k, v in data.get("metrics", {}).items():
                    run_entry[f"metric_{k}"] = v
                for k, v in data.get("params", {}).items():
                    run_entry[f"param_{k}"] = v
                runs.append(run_entry)
        except Exception:
            pass

    # Sort newest first
    runs.sort(key=lambda r: r.get("start_time", ""), reverse=True)
    return runs


def start_run(run_name=None):
    run_id = uuid.uuid4().hex
    return LightweightRun(run_id)
