#!/usr/bin/env python3
"""Submit taptoagent.com URLs to IndexNow (Bing, Yandex, Naver...).

Usage:
    python3 scripts/submit-indexnow.py https://taptoagent.com/blog/xxx.html [more urls...]
    python3 scripts/submit-indexnow.py --all        # submit every URL in sitemap.xml

Key file must be live at https://taptoagent.com/<KEY>.txt (repo root).
Google does NOT support IndexNow; this only speeds up Bing-family engines.
"""
import json
import sys
import urllib.request
from xml.etree import ElementTree

KEY = "81e45638e6af2e14c94e06363b5235be"
HOST = "taptoagent.com"
ENDPOINT = "https://api.indexnow.org/indexnow"


def submit(urls):
    payload = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": f"https://{HOST}/{KEY}.txt",
        "urlList": urls,
    }).encode()
    req = urllib.request.Request(
        ENDPOINT, data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode()[:200]
        print(f"HTTP {r.status} for {len(urls)} urls: {body}")
        return r.status


def all_urls():
    tree = ElementTree.parse("sitemap.xml")
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    return [e.text for e in tree.findall(".//s:loc", ns)]


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--all"]
    urls = all_urls() if "--all" in sys.argv else args
    if not urls:
        sys.exit("no urls given")
    # IndexNow allows up to 10k urls per request; chunk defensively
    for i in range(0, len(urls), 1000):
        submit(urls[i:i + 1000])
