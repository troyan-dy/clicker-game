"""Repeat the Pages deployment of the current GitHub master through the normal release checks."""
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    npm = "npm.cmd" if os.name == "nt" else "npm"
    subprocess.run([npm, "run", "test:coverage"], cwd=ROOT, check=True)
    result = subprocess.check_output(
        [
            "gh", "api", "--method", "POST", "-H", "X-GitHub-Api-Version: 2026-03-10",
            "repos/{owner}/{repo}/actions/workflows/pages.yml/dispatches", "-f", "ref=master",
        ],
        cwd=ROOT,
    )
    run = json.loads(result)
    print(run["html_url"], flush=True)
    subprocess.run(
        ["gh", "run", "watch", str(run["workflow_run_id"]), "--exit-status"], cwd=ROOT, check=True,
    )


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(error.returncode)
