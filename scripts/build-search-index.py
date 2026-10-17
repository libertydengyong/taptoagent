#!/usr/bin/env python3
"""Build search-index.json for TapToAgent site-wide search.

Walks all HTML files, extracts title/description/canonical, infers the
entry type from the path, and attaches target keywords from the keyword map.
Run after publishing new pages: python3 scripts/build-search-index.py
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYWORD_MAP = os.path.expanduser(
    "~/workspace/goals/taptoagent-ai-navigation-site-launch/hidden_files/keyword-map.md")
OUT = os.path.join(ROOT, "search-index.json")

def clean_url(u):
    u = re.sub(r"[（(].*[)）]", "", u).strip()  # strip （第36篇）/（hub） notes
    return u

def load_keywords():
    kw = {}
    try:
        for line in open(KEYWORD_MAP, encoding="utf-8"):
            line = line.strip()
            if not line.startswith("|") or line.startswith("|---") or "页面" in line:
                continue
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) >= 2:
                kw[clean_url(cells[0])] = cells[1]
    except FileNotFoundError:
        pass
    return kw

def page_url(path):
    rel = os.path.relpath(path, ROOT)
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[:-len("index.html")]
    return "/" + rel

def entry_type(url):
    if re.fullmatch(r"/agents/[a-z0-9-]+\.html", url):
        return "agent"
    if re.fullmatch(r"/agents/[a-z]+/", url):
        return "hub"
    if url.startswith("/blog/") and url.endswith(".html"):
        return "article"
    return "page"

def extract(path):
    html = open(path, encoding="utf-8").read()
    m = re.search(r"<title>(.*?)</title>", html, re.S)
    title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""
    title = re.sub(r"\s*\|\s*TapToAgent\s*$", "", title)
    m = re.search(r'<meta name="description" content="([^"]*)"', html)
    desc = m.group(1).strip() if m else ""
    return title, desc

def main():
    keywords = load_keywords()
    entries = []
    for dirpath, _, files in os.walk(ROOT):
        if ".git" in dirpath:
            continue
        for fn in files:
            if not fn.endswith(".html"):
                continue
            path = os.path.join(dirpath, fn)
            url = page_url(path)
            title, desc = extract(path)
            if not title:
                continue
            entries.append({
                "title": title,
                "url": url,
                "type": entry_type(url),
                "desc": desc[:160],
                "keywords": keywords.get(url, ""),
            })
    # stable order: hubs, agents, articles, pages
    order = {"hub": 0, "agent": 1, "article": 2, "page": 3}
    entries.sort(key=lambda e: (order.get(e["type"], 9), e["title"]))
    json.dump(entries, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"Wrote {OUT}: {len(entries)} entries "
          f"({sum(1 for e in entries if e['type']=='agent')} agents, "
          f"{sum(1 for e in entries if e['type']=='article')} articles, "
          f"{sum(1 for e in entries if e['type']=='hub')} hubs)")

if __name__ == "__main__":
    main()
