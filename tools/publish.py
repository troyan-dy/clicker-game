# Publishes the release build to GitHub Pages: dist/ goes to the gh-pages branch of origin as plain files.
# A separate throwaway repository is used on purpose: no .gitattributes there, so pictures are not LFS pointers
# (Pages does not resolve them). Run from the project root, only when the user asked to publish.
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.getcwd()


def sh(*cmd, cwd=ROOT):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        print("FAILED:", " ".join(cmd), "\n", (r.stdout + r.stderr).strip()[-600:])
        sys.exit(1)
    return r.stdout.strip()


npm = "npm.cmd" if os.name == "nt" else "npm"
sh(npm, "run", "build")
remote = sh("git", "remote", "get-url", "origin")
commit = sh("git", "rev-parse", "--short", "HEAD")
name, email = sh("git", "config", "user.name"), sh("git", "config", "user.email")
tmp = tempfile.mkdtemp(prefix="pages-")
site = os.path.join(tmp, "site")
shutil.copytree(os.path.join(ROOT, "dist"), site)
open(os.path.join(site, ".nojekyll"), "w").close()
sh("git", "init", "-q", "-b", "gh-pages", cwd=site)
sh("git", "add", "-A", cwd=site)
sh("git", "-c", f"user.name={name}", "-c", f"user.email={email}", "commit", "-q", "-m", f"build of {commit}", cwd=site)
sh("git", "push", "-f", remote, "gh-pages", cwd=site)
print(f"gh-pages <- dist of {commit}: {sum(len(f) for _, _, f in os.walk(site))} files")
