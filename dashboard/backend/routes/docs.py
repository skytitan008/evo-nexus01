"""Public documentation endpoint — serves markdown docs from docs/ folder."""

import re
from pathlib import Path

from flask import Blueprint, jsonify, send_from_directory, abort

from routes._helpers import WORKSPACE

bp = Blueprint("docs", __name__)

DOCS_DIR = WORKSPACE / "docs"
IMGS_DIR = DOCS_DIR / "imgs"

# Ordering for top-level files in "Getting Started"
_TOP_LEVEL_ORDER = ["introduction.md", "getting-started.md", "architecture.md"]


def _title_from_md(path: Path) -> str:
    """Extract first H1 from a markdown file, or derive from filename."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
        for line in text.splitlines():
            m = re.match(r"^#\s+(.+)", line)
            if m:
                return m.group(1).strip()
    except Exception:
        pass
    # Fallback: derive from filename
    return path.stem.replace("-", " ").replace("_", " ").title()


def _slug(name: str) -> str:
    return name.replace(" ", "-").lower()


def _build_tree() -> list[dict]:
    """Scan docs/ and build a section tree."""
    if not DOCS_DIR.is_dir():
        return []

    sections: list[dict] = []

    # 1) Top-level .md files → "Getting Started" section
    top_files = [f for f in DOCS_DIR.iterdir() if f.is_file() and f.suffix == ".md"]
    # Sort by predefined order, then alphabetically
    order_map = {name: i for i, name in enumerate(_TOP_LEVEL_ORDER)}
    top_files.sort(key=lambda f: (order_map.get(f.name, 999), f.name))

    if top_files:
        children = []
        for f in top_files:
            title = _title_from_md(f)
            children.append({
                "title": title,
                "slug": f.stem,
                "path": f.name,
            })
        sections.append({
            "title": "Getting Started",
            "slug": "getting-started",
            "children": children,
        })

    # 2) Subdirectories → one section each
    subdirs = sorted(
        [d for d in DOCS_DIR.iterdir() if d.is_dir() and d.name != "imgs"],
        key=lambda d: d.name,
    )
    for subdir in subdirs:
        md_files = sorted(subdir.rglob("*.md"), key=lambda f: f.name)
        if not md_files:
            continue
        children = []
        for f in md_files:
            rel = f.relative_to(DOCS_DIR)
            title = _title_from_md(f)
            children.append({
                "title": title,
                "slug": str(rel.with_suffix("")),
                "path": str(rel),
            })
        sections.append({
            "title": subdir.name.replace("-", " ").replace("_", " ").title(),
            "slug": subdir.name,
            "children": children,
        })

    return sections


@bp.route("/api/docs")
def doc_tree():
    """Return the documentation tree structure."""
    return jsonify({"sections": _build_tree()})


@bp.route("/api/docs/imgs/<path:filename>")
def doc_image(filename: str):
    """Serve images from docs/imgs/."""
    if not IMGS_DIR.is_dir():
        abort(404)
    # Security: prevent path traversal
    safe = Path(filename).name
    img_path = IMGS_DIR / safe
    if not img_path.is_file():
        abort(404)
    return send_from_directory(str(IMGS_DIR), safe)


@bp.route("/api/docs/<path:filepath>")
def doc_content(filepath: str):
    """Return raw markdown content of a doc file."""
    # Security: resolve and ensure it stays within docs/
    target = (DOCS_DIR / filepath).resolve()
    if not str(target).startswith(str(DOCS_DIR.resolve())):
        abort(403)
    if not target.is_file() or target.suffix != ".md":
        abort(404)

    content = target.read_text(encoding="utf-8", errors="replace")

    # Rewrite image paths: ../imgs/X → /api/docs/imgs/X and imgs/X → /api/docs/imgs/X
    content = re.sub(r"!\[([^\]]*)\]\(\.\./imgs/([^)]+)\)", r"![\1](/api/docs/imgs/\2)", content)
    content = re.sub(r"!\[([^\]]*)\]\(imgs/([^)]+)\)", r"![\1](/api/docs/imgs/\2)", content)

    return content, 200, {"Content-Type": "text/plain; charset=utf-8"}
