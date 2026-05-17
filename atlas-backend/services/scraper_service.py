import re
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
import string
try:
    from rapidfuzz import process as rf_process
    from rapidfuzz import fuzz as rf_fuzz
    _HAS_RAPIDFUZZ = True
except Exception:
    rf_process = None
    rf_fuzz = None
    _HAS_RAPIDFUZZ = False
import difflib
try:
    from playwright.sync_api import sync_playwright
    _HAS_PLAYWRIGHT = True
except Exception:
    sync_playwright = None
    _HAS_PLAYWRIGHT = False


_NOISE_TOKENS = (
    "cart",
    "checkout",
    "wishlist",
    "login",
    "sign in",
    "search",
    "menu",
    "account",
)

_PERIPHERAL_TOKENS = (
    "keyboard",
    "mouse",
    "headset",
    "speaker",
    "webcam",
    "controller",
    "microphone",
    "mic ",
    "printer",
    "scanner",
    "monitor",
    "chair",
    "desk",
    "adapter",
    "dongle",
    "cable",
    "hub",
)

_PC_PART_CATEGORY_TOKENS = (
    "cpu",
    "processor",
    "gpu",
    "graphics card",
    "vga",
    "video card",
    "ram",
    "memory",
    "ssd",
    "nvme",
    "hdd",
    "storage",
    "motherboard",
    "psu",
    "power supply",
    "case",
    "chassis",
    "cooler",
    "heatsink",
    "aio",
    "fan",
    "pc case",
)

_NON_PC_TITLE_TOKENS = (
    "laptop",
    "notebook",
    "ultrabook",
    "chromebook",
    "tablet",
    "all-in-one",
    "aio pc",
    "monitor",
    "keyboard",
    "mouse",
    "headset",
    "webcam",
    "speaker",
    "printer",
    "scanner",
    "router",
    "modem",
    "switch",
    "phone",
    "smartwatch",
    "fight stick",
    "fightstick",
    "arcade stick",
    "joystick",
    "gamepad",
    "steering wheel",
    "racing wheel",
    "console",
    "arcade",
    "fighting stick",
)


def _clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\u00a0", " ")
    return re.sub(r"\s+", " ", text).strip()


def clean_listing_title(title: str) -> str:
    """Clean obvious UI noise from scraped product titles."""
    title = _clean_text(title)
    if not title:
        return ""
    title = re.sub(r"^electro-cart-icon\s*", "", title, flags=re.I)
    title = re.sub(r"^from\s*₱\s*[0-9][0-9,]*\.?[0-9]*\s*", "", title, flags=re.I)
    title = re.sub(r"^₱\s*[0-9][0-9,]*\.?[0-9]*\s*", "", title, flags=re.I)
    title = re.sub(r"\s*(sold out|choose options|quick view)\s*", " ", title, flags=re.I)
    title = re.sub(r"\s*\|\s*(EasyPC|PCX|PC Worth|PCWorth|GameOne)\s*$", "", title, flags=re.I)
    title = re.sub(r"\b(from|sold out|choose options|quick view)\b", " ", title, flags=re.I)
    title = re.sub(r"\s+", " ", title).strip(" -|/")
    return title


def extract_image_url(node) -> Optional[str]:
    """Extract a likely product image URL from a product tile."""
    candidates = []
    for img in node.find_all("img"):
        for attr in ("data-src", "data-lazy-src", "data-original", "src", "srcset"):
            value = img.get(attr)
            if not value:
                continue
            if attr == "srcset":
                value = str(value).split(" ")[0].split(",")[0].strip()
            candidates.append(str(value).strip())
    for attr in ("data-image", "data-img", "data-thumbnail"):
        value = node.get(attr)
        if value:
            candidates.append(str(value).strip())

    for candidate in candidates:
        if candidate and not candidate.startswith("data:"):
            return candidate
    return None


def extract_image_url_from_soup(soup: BeautifulSoup) -> Optional[str]:
    """Extract an image URL from metadata or visible images on a page."""
    if not soup:
        return None

    for selector in (
        "meta[property='og:image']",
        "meta[name='og:image']",
        "meta[property='twitter:image']",
        "meta[name='twitter:image']",
        "meta[property='product:image']",
    ):
        el = soup.select_one(selector)
        if el and el.get("content"):
            value = str(el.get("content")).strip()
            if value and not value.startswith("data:"):
                return value

    for img in soup.find_all("img"):
        for attr in ("data-src", "data-lazy-src", "data-original", "src", "srcset"):
            value = img.get(attr)
            if not value:
                continue
            if attr == "srcset":
                value = str(value).split(" ")[0].split(",")[0].strip()
            value = str(value).strip()
            if value and not value.startswith("data:"):
                return value

    return None


def _is_noise_title(title: str) -> bool:
    lowered = (title or "").lower()
    if not lowered:
        return True
    if lowered.startswith("http://") or lowered.startswith("https://"):
        return True
    if "://" in lowered:
        return True
    if len(lowered) < 8:
        return True
    if any(token in lowered for token in _NOISE_TOKENS):
        return True
    if re.fullmatch(r"[0-9\s.,]+", lowered):
        return True
    return False


def _is_pc_parts_title(title: str) -> bool:
    lowered = clean_listing_title(title).lower()
    if not lowered:
        return False
    if any(token in lowered for token in _PERIPHERAL_TOKENS):
        return False
    if any(token in lowered for token in _NON_PC_TITLE_TOKENS):
        return False
    if _is_prebuilt_title(lowered):
        return True
    if infer_component_category(lowered) is not None:
        return True
    if "mini pc" in lowered or "small form factor pc" in lowered:
        return True
    return any(token in lowered for token in _PC_PART_CATEGORY_TOKENS)


def _parse_price_text(text: str) -> Optional[float]:
    if not text:
        return None
    text = _clean_text(text)
    if not text:
        return None

    # Prefer price-like formats and avoid generic model numbers.
    patterns = [
        r"(?:₱|php)\s*([0-9][0-9,]*\.?[0-9]*)",
        r"(?:price|srp|sale|now only|promo)\D*([0-9][0-9,]*\.?[0-9]*)",
        r"([0-9][0-9,]{2,}\.?[0-9]*)",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, flags=re.I)
        if not m:
            continue
        raw = m.group(1).replace(',', '')
        try:
            return float(raw)
        except ValueError:
            continue
    return None


def _extract_price_from_node(node) -> Optional[float]:
    price_selectors = [
        ".price",
        ".woocommerce-Price-amount",
        ".prod-price",
        ".product-price",
        ".price-tag",
        ".amount",
        ".price_amount",
        "[class*='price']",
        "[data-price]",
    ]

    for selector in price_selectors:
        el = node.select_one(selector)
        if not el:
            continue
        for candidate in (el.get("data-price"), el.get("content"), el.get_text(" ", strip=True)):
            if not candidate:
                continue
            parsed = _parse_price_text(str(candidate))
            if parsed is not None:
                return parsed

    # Only fall back to general text if it looks like price text.
    for attr in ("aria-label", "data-price", "data-amount", "title"):
        value = node.get(attr)
        if value:
            lowered = str(value).lower()
            if any(marker in lowered for marker in ("₱", "php", "price", "srp", "sale", "now only", "promo")):
                parsed = _parse_price_text(str(value))
                if parsed is not None:
                    return parsed

    text = node.get_text(" ", strip=True)
    lowered = text.lower()
    if any(marker in lowered for marker in ("₱", "php", "price", "srp", "sale", "now only", "promo")):
        return _parse_price_text(text)

    return None


def _is_prebuilt_title(title: str) -> bool:
    lowered = (title or "").lower()
    return any(token in lowered for token in (
        "desktop",
        "gaming pc",
        "gaming desktop",
        "pc bundle",
        "bundle",
        "pre-built",
        "prebuilt",
        "build kit",
        "starter gaming",
        "desktop computer",
        "ready to use",
        "productivity desktop",
    ))


def infer_component_category(title: str) -> str | None:
    """Infer a normalized category from product keywords.

    Rules:
    - Multiple distinct part keywords or desktop/build language => Pre-built
    - Single clear keyword maps to CPU/GPU/RAM/Storage/Motherboard/PSU/Case/Cooling
    - HDD / hard drive language maps to Storage
    """
    if not title:
        return None

    lowered = clean_listing_title(title).lower()

    keyword_groups = {
        "CPU": ["ryzen", "intel", "core i3", "core i5", "core i7", "core i9", "processor", "apu"],
        "GPU": ["rtx", "gtx", "gpu", "graphics", "radeon"],
        "RAM": ["ram", "ddr4", "ddr5", "memory"],
        "Storage": ["ssd", "nvme", "hdd", "hard drive", "hard disk", "storage"],
        "Motherboard": ["motherboard", "mobo", "a520", "b450", "b550", "x570", "z690", "z790"],
        "PSU": ["psu", "power supply", "80 plus", "80plus"],
        "Case": ["case", "chassis"],
        "Cooling": ["cooler", "heatsink", "aio", "liquid cooler"],
    }

    found_categories = []
    for category, keywords in keyword_groups.items():
        if any(keyword in lowered for keyword in keywords):
            found_categories.append(category)

    # Desktop/build bundle language or multiple component groups implies a pre-built system
    prebuilt_signals = [
        _is_prebuilt_title(title),
        "desktop" in lowered,
        "gaming pc" in lowered,
        "gaming desktop" in lowered,
        "bundle" in lowered,
        "build kit" in lowered,
        "ready to use" in lowered,
        lowered.count("/") >= 2,
        len(found_categories) >= 2,
    ]
    if any(prebuilt_signals):
        return "Pre-built"

    if found_categories:
        return found_categories[0]

    return None


def _category_from_title(title: str) -> str | None:
    if _is_prebuilt_title(title):
        return "Pre-built"

    lowered = (title or "").lower()
    categories = {
        "CPU": [" cpu ", "processor", "ryzen", "core i3", "core i5", "core i7", "core i9", "apu"],
        "GPU": ["gpu", "graphics", "rtx", "gtx", "radeon"],
        "Motherboard": ["motherboard", "mobo", "a520", "b450", "b550", "x570", "z690", "z790"],
        "RAM": ["ram", "ddr4", "ddr5", "memory"],
        "Storage": ["ssd", "nvme", "hdd", "storage"],
        "PSU": ["psu", "power supply", "80 plus", "80plus"],
        "Case": ["case", "chassis"],
        "Cooling": ["cooler", "heatsink", "aio", "liquid cooler"],
    }
    for category, keywords in categories.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return None


def should_import_listing(title: str) -> bool:
    """Return True only when a scraped listing looks like a real component or pre-built system."""
    cleaned = clean_listing_title(title)
    if _is_noise_title(cleaned):
        return False
    if not _is_pc_parts_title(cleaned):
        return False
    if _is_prebuilt_title(cleaned):
        return True
    return infer_component_category(cleaned) is not None


def _same_site(base_url: str, candidate_url: str) -> bool:
    if not candidate_url:
        return False
    try:
        base = urlparse(base_url)
        candidate = urlparse(candidate_url)
        return candidate.netloc == base.netloc
    except Exception:
        return False


def _normalize_url(base_url: str, candidate_url: str) -> Optional[str]:
    if not candidate_url:
        return None
    try:
        absolute = urljoin(base_url, candidate_url)
        parsed = urlparse(absolute)
        if parsed.scheme not in ("http", "https"):
            return None
        return parsed._replace(fragment="").geturl()
    except Exception:
        return None


def _looks_like_listing_url(url: str) -> bool:
    lowered = (url or "").lower()
    return any(token in lowered for token in (
        "category",
        "collections",
        "shop",
        "products",
        "product",
        "catalog",
        "search",
        "pc",
        "gaming",
        "component",
    ))


def _looks_like_product_url(url: str) -> bool:
    lowered = (url or "").lower()
    return any(token in lowered for token in (
        "/product/",
        "/products/",
        "/item/",
        "/p/",
        "/shop/",
    ))


def _looks_like_pagination_url(url: str) -> bool:
    lowered = (url or "").lower()
    return any(token in lowered for token in (
        "page=",
        "/page/",
        "?p=",
        "?paged=",
        "?page=",
    ))


def _build_next_page_url(url: str, page_increment: int = 1) -> Optional[str]:
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return None

        query_pairs = re.findall(r"([^=&]+)=([^&]*)", parsed.query)
        query_parts = []
        replaced = False
        current_page = None
        for key, value in query_pairs:
            if key.lower() == "page":
                try:
                    current_page = int(value)
                except ValueError:
                    current_page = None
                next_page = (current_page or 1) + max(page_increment, 1)
                query_parts.append(f"page={next_page}")
                replaced = True
            else:
                query_parts.append(f"{key}={value}")
        if replaced:
            return parsed._replace(query="&".join(query_parts)).geturl()

        path = parsed.path.rstrip("/")
        if path.endswith("/pages"):
            return parsed._replace(path=f"{path}/{max(page_increment, 1) + 1}").geturl()
        if path.endswith("/page"):
            return parsed._replace(path=f"{path}/{max(page_increment, 1) + 1}").geturl()
        if "/collections/" in path or "/category/" in path or "/products" in path or "/shop/" in path:
            next_page = max(page_increment, 1) + 1
            separator = "&" if parsed.query else "?"
            return parsed._replace(query=f"{parsed.query}{separator if parsed.query else ''}page={next_page}".strip("?&")).geturl()

        next_page = max(page_increment, 1) + 1
        separator = "&" if parsed.query else "?"
        return parsed._replace(query=f"{parsed.query}{separator if parsed.query else ''}page={next_page}".strip("?&")).geturl()
    except Exception:
        return None


def _fetch_html(url: str) -> str:
    headers = {"User-Agent": "ATLASBot/1.0 (+https://example.com)"}
    with httpx.Client(timeout=20) as client:
        resp = client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.text


def _render_html(url: str) -> str:
    if not _HAS_PLAYWRIGHT:
        return ""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, timeout=30000, wait_until="networkidle")
            last_height = 0
            for _ in range(8):
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(1200)
                current_height = page.evaluate("document.body.scrollHeight")
                if current_height == last_height:
                    break
                last_height = current_height
            page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_timeout(500)
            html = page.content()
            browser.close()
            return html
    except Exception:
        return ""


def _get_html(url: str) -> str:
    try:
        html = _fetch_html(url)
        if html and len(html) >= 200:
            return html
    except Exception:
        pass
    return _render_html(url)


def _extract_candidate_links(base_url: str, soup: BeautifulSoup) -> List[str]:
    candidates: List[str] = []
    seen = set()
    for anchor in soup.find_all("a", href=True):
        href = anchor.get("href")
        normalized = _normalize_url(base_url, href)
        if not normalized or normalized in seen:
            continue
        if not _same_site(base_url, normalized):
            continue
        text = clean_listing_title(anchor.get_text(" ", strip=True) or "")
        rel = " ".join(anchor.get("rel") or []).lower() if anchor.get("rel") else ""
        if _is_noise_title(text):
            if not (_looks_like_pagination_url(normalized) or "next" in text.lower() or "next" in rel):
                continue
        if (
            _looks_like_listing_url(normalized)
            or _looks_like_product_url(normalized)
            or _looks_like_pagination_url(normalized)
            or _is_pc_parts_title(text)
            or "next" in text.lower()
            or "next" in rel
        ):
            seen.add(normalized)
            candidates.append(normalized)
    return candidates


def _scrape_page_items(url: str, html: str, store_name: str, limit: int) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html or "", "html.parser")

    selectors = [
        "article.product",
        ".product",
        ".product-item",
        ".item",
        "li.product",
        ".search-result",
        ".woocommerce-LoopProduct-link",
        ".product-list",
        ".listing",
    ]

    candidates = []
    for sel in selectors:
        found = soup.select(sel)
        if found:
            candidates = found
            break

    if not candidates:
        anchors = soup.find_all("a", href=True)
        for a in anchors:
            txt = clean_listing_title(a.get_text(separator=" ") or "")
            if len(txt) > 5 and re.search(r"\d", txt):
                candidates.append(a)

    items: List[Dict[str, Any]] = []
    seen = set()
    for node in candidates:
        if len(items) >= limit:
            break

        link = None
        if node.name == "a" and node.get("href"):
            link = _normalize_url(url, node.get("href"))
        else:
            a = node.find("a", href=True)
            if a:
                link = _normalize_url(url, a.get("href"))

        title = clean_listing_title(node.get_text(separator=" ") or "")
        if not title and link:
            title = clean_listing_title(link)
        if _is_noise_title(title):
            continue
        if not should_import_listing(title):
            continue

        price = _extract_price_from_node(node)
        image_url = extract_image_url(node) or extract_image_url_from_soup(node)
        if not image_url and link and _looks_like_product_url(link):
            linked_html = _get_html(link)
            if linked_html:
                linked_soup = BeautifulSoup(linked_html, "html.parser")
                image_url = extract_image_url_from_soup(linked_soup)
        key = (title, link, price)
        if key in seen:
            continue
        seen.add(key)

        items.append({"title": title, "link": link, "price": price, "image_url": image_url, "store": store_name})

    return items


def _scrape_detail_page_item(url: str, html: str, store_name: str) -> List[Dict[str, Any]]:
    """Fallback parser for single product pages."""
    soup = BeautifulSoup(html or "", "html.parser")

    title = ""
    title_selectors = [
        "h1.product_title",
        "h1.product-title",
        "h1.entry-title",
        "h1",
        "meta[property='og:title']",
        "title",
    ]
    for selector in title_selectors:
        el = soup.select_one(selector)
        if not el:
            continue
        if el.name == "meta":
            title = clean_listing_title(el.get("content") or "")
        else:
            title = clean_listing_title(el.get_text(" ", strip=True) or "")
        if title:
            break

    if not title or _is_noise_title(title) or not should_import_listing(title):
        return []

    price = _extract_price_from_node(soup)
    image_url = extract_image_url_from_soup(soup) or extract_image_url(soup)

    return [{"title": title, "link": url, "price": price, "image_url": image_url, "store": store_name}]


def _crawl_site(url: str, limit: int = 20, store_name: str = "store", max_pages: int = 25) -> List[Dict[str, Any]]:
    """Crawl a retailer site from the entry URL and collect PC parts listings from internal pages."""
    queue = [_normalize_url(url, url) or url]
    visited = set()
    items_by_key: Dict[str, Dict[str, Any]] = {}
    page_counter = 1
    consecutive_empty_pages = 0

    while queue and len(visited) < max_pages and len(items_by_key) < limit:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)

        html = _get_html(current)
        if not html:
            continue

        page_items = _scrape_page_items(current, html, store_name, limit - len(items_by_key))
        if not page_items:
            page_items = _scrape_detail_page_item(current, html, store_name)
        page_had_items = bool(page_items)
        for item in page_items:
            merge_key = _normalize_url(current, item.get("link") or current) or (item.get("title") or "").lower()
            existing = items_by_key.get(merge_key)
            if existing:
                if not existing.get("image_url") and item.get("image_url"):
                    existing["image_url"] = item.get("image_url")
                if existing.get("price") is None and item.get("price") is not None:
                    existing["price"] = item.get("price")
                continue
            items_by_key[merge_key] = item
        if page_had_items:
            consecutive_empty_pages = 0
        else:
            consecutive_empty_pages += 1
        if len(items_by_key) >= limit:
            break
        if consecutive_empty_pages >= 2:
            break

        soup = BeautifulSoup(html, "html.parser")
        for next_url in _extract_candidate_links(current, soup):
            if next_url not in visited and next_url not in queue:
                queue.append(next_url)

        # Explicitly walk paginated listing pages even when the site doesn't expose a next-link.
        if page_had_items:
            next_page_url = _build_next_page_url(current, 1)
        else:
            next_page_url = None
        page_counter += 1
        if next_page_url and next_page_url not in visited and next_page_url not in queue and len(visited) < max_pages:
            queue.append(next_page_url)

    return list(items_by_key.values())[:limit]


def scrape_easypc_list(url: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Crawl EasyPC pages and collect only PC parts or pre-built systems."""
    return _crawl_site(url, limit=limit, store_name="easypc")


def _basic_list_scrape(url: str, limit: int = 20, store_name: str = "store") -> List[Dict[str, Any]]:
    """Generic crawl that walks same-site product and category pages."""
    return _crawl_site(url, limit=limit, store_name=store_name)


def scrape_pcx_list(url: str, limit: int = 20) -> List[Dict[str, Any]]:
    return _basic_list_scrape(url, limit=limit, store_name="pcx")


def scrape_pcworth_list(url: str, limit: int = 20) -> List[Dict[str, Any]]:
    return _basic_list_scrape(url, limit=limit, store_name="pcworth")


def scrape_gameone_list(url: str, limit: int = 20) -> List[Dict[str, Any]]:
    return _basic_list_scrape(url, limit=limit, store_name="gameone")


def scrape_site_by_url(url: str, limit: int = 20) -> List[Dict[str, Any]]:
    host = url.lower()
    if "easypc" in host:
        return scrape_easypc_list(url, limit=limit)
    if "pcx" in host:
        return scrape_pcx_list(url, limit=limit)
    if "pcworth" in host:
        return scrape_pcworth_list(url, limit=limit)
    if "gameone" in host:
        return scrape_gameone_list(url, limit=limit)
    # fallback
    return _basic_list_scrape(url, limit=limit, store_name="unknown")


def normalize_title(title: str) -> str:
    """Normalize product titles for comparison: lowercase, remove punctuation, collapse spaces."""
    if not title:
        return ""
    # Replace non-breaking spaces
    t = title.replace('\u00a0', ' ')
    # Lowercase
    t = t.lower()
    # Remove punctuation except alphanumeric and spaces
    allowed = set(string.ascii_lowercase + string.digits + ' ')
    t = ''.join(ch for ch in t if ch in allowed)
    # Collapse whitespace
    t = re.sub(r"\s+", " ", t).strip()
    return t


def find_best_match(title: str, candidates: list[str], cutoff: float = 0.82) -> Optional[str]:
    """Return the best candidate match for title from candidates using rapidfuzz if available, otherwise difflib."""
    if not title or not candidates:
        return None
    norm_title = normalize_title(title)
    norm_map = {normalize_title(c): c for c in candidates}
    norm_candidates = list(norm_map.keys())

    # Try rapidfuzz first for better accuracy/performance
    if _HAS_RAPIDFUZZ:
        try:
            # rf_process.extractOne returns (match, score, index)
            match = rf_process.extractOne(norm_title, norm_candidates, scorer=rf_fuzz.ratio)
            if match and match[1] >= cutoff * 100:
                return norm_map.get(match[0])
        except Exception:
            pass

    # Fallback to difflib
    matches = difflib.get_close_matches(norm_title, norm_candidates, n=1, cutoff=cutoff)
    if matches:
        return norm_map[matches[0]]
    return None


def parse_brand_category(title: str) -> tuple[Optional[str], Optional[str]]:
    """Simple heuristics to extract brand and category from a product title."""
    if not title:
        return None, None

    lowered = title.lower()

    # Known brand tokens
    brands = [
        "amd",
        "intel",
        "nvidia",
        "asus",
        "msi",
        "gigabyte",
        "gigabyte",
        "corsair",
        "kingston",
        "samsung",
        "seagate",
        "wd",
        "evga",
        "cooler master",
        "coolermaster",
        "nzxt",
        "thermaltake",
        "deepcool",
        "adata",
    ]

    brand_found = None
    for b in brands:
        if re.search(r"\b" + re.escape(b) + r"\b", lowered):
            brand_found = b.title()
            break

    category_found = infer_component_category(title)
    if not category_found:
        categories = {
            "accessories": ["fan", "cable", "adapter", "controller"],
        }
        for cat, keys in categories.items():
            for k in keys:
                if k in lowered:
                    category_found = cat.title()
                    break
            if category_found:
                break

    return brand_found, category_found

