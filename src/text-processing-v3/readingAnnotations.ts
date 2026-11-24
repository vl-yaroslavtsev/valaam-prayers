/**
 * Сноски и якоря внутри текста читалки.
 * Метки сносок приходят как <sup class="fn-ref" data-fn="1"><a href="#fn-1" ...>1</a></sup>,
 * тексты сносок — в конце блока в <section data-footnotes><ol><li data-fn="1">...</li></ol></section>,
 * переходы по тексту — как <a href="#v-a"> на пустой <a id="v-a"></a>.
 */

export type TextAction =
  | { type: "footnote"; id: string }
  | { type: "anchor"; id: string };

export interface PreparedReadingHtml {
  html: string;
  footnotes: Record<string, string>;
}

const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "LI", "DIV"]);
const WORD_JOINER = "\u2060";
const ANNOTATION_HINT_RE = /(?:data-footnotes|fn-ref|\sid=)/i;

const decodeFragment = (href: string): string => {
  const raw = href.slice(1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const isFirstContent = (block: Element, anchor: Element): boolean => {
  for (const node of block.childNodes) {
    if (node === anchor) return true;
    if (node.nodeType === Node.TEXT_NODE && !(node.textContent || "").trim()) continue;
    return false;
  }
  return false;
};

/** Пустой якорь не переживает нарезку страниц: id переносится на абзац, в котором он стоит. */
const liftEmptyAnchors = (root: HTMLElement): void => {
  root.querySelectorAll("a[id]").forEach((anchor) => {
    if (!(anchor instanceof HTMLAnchorElement) || anchor.getAttribute("href")) return;
    if ((anchor.textContent || "").trim()) return;

    const id = anchor.id;
    let block: HTMLElement | null = anchor.parentElement;
    while (block && block !== root && !BLOCK_TAGS.has(block.tagName)) {
      block = block.parentElement;
    }
    const blockHasText = !!block && block !== root && !!(block.textContent || "").trim();
    if (block && block !== root && !block.id && blockHasText && isFirstContent(block, anchor)) {
      block.id = id;
      anchor.remove();
      return;
    }

    if (!anchor.textContent) anchor.textContent = WORD_JOINER;
    anchor.classList.add("text-anchor");
  });
};

/** Классы совпадают с f7-badge (span), чтобы не тянуть сюда Vue и framework7-vue. */
const renderFootnoteBadge = (label: string, id: string): HTMLElement => {
  const badge = document.createElement("span");
  badge.className = "badge fn-badge";
  badge.dataset.fn = id;
  badge.setAttribute("role", "button");
  badge.setAttribute("aria-label", `Сноска ${label}`);
  badge.textContent = label;
  return badge;
};

/** Последнее слово перед меткой и сам бейдж переносятся только вместе. */
const attachToWord = (sup: Element, badge: HTMLElement): void => {
  const wrap = document.createElement("span");
  wrap.className = "fn-word";
  const prev = sup.previousSibling;

  if (prev instanceof Text && /(\S+)\s*$/.test(prev.data)) {
    const match = /(\S+)\s*$/.exec(prev.data);
    const word = match?.[1] ?? "";
    prev.data = prev.data.slice(0, prev.data.length - (match?.[0].length ?? 0));
    wrap.append(document.createTextNode(word), badge);
  } else if (prev instanceof Element) {
    wrap.append(prev, badge);
  } else {
    wrap.append(badge);
  }

  sup.replaceWith(wrap);
};

const extractFootnoteContent = (li: Element): string => {
  li.querySelectorAll(".footnote-backref").forEach((backref) => backref.remove());
  li.querySelectorAll("p").forEach((p) => {
    if (p.childElementCount === 0 && !(p.textContent || "").trim()) p.remove();
  });
  return li.innerHTML.replace(/\s+(<\/p>)/g, "$1").trim();
};

/**
 * Изолирует локальные номера сносок и якоря внутри одного текстового блока,
 * чтобы при склейке нескольких текстов (главы книги) `data-fn="1"` и `id="v-a"`
 * из разных блоков не пересекались.
 */
export function scopeReadingAnnotations(html: string, scope: string): string {
  if (!scope || !ANNOTATION_HINT_RE.test(html)) return html;

  const root = document.createElement("div");
  root.innerHTML = html;

  root.querySelectorAll("sup.fn-ref[data-fn]").forEach((sup) => {
    const rawId = sup.getAttribute("data-fn")?.trim();
    if (rawId) sup.setAttribute("data-fn", `${scope}:${rawId}`);
  });

  root.querySelectorAll("[data-footnotes] li[data-fn]").forEach((li) => {
    const rawId = li.getAttribute("data-fn")?.trim();
    if (rawId) li.setAttribute("data-fn", `${scope}:${rawId}`);
  });

  const scopedAnchorIds = new Set<string>();
  root.querySelectorAll("[id]").forEach((el) => {
    if (el.closest("[data-footnotes]") || el.closest("sup.fn-ref")) return;
    const id = el.getAttribute("id");
    if (!id) return;
    scopedAnchorIds.add(id);
    el.setAttribute("id", `${scope}--${id}`);
  });

  if (scopedAnchorIds.size > 0) {
    root.querySelectorAll('a[href^="#"]').forEach((link) => {
      if (link.closest("sup.fn-ref") || link.classList.contains("footnote-backref")) return;
      const href = link.getAttribute("href");
      if (!href || href.length <= 1) return;
      const targetId = decodeFragment(href);
      if (scopedAnchorIds.has(targetId)) {
        link.setAttribute("href", `#${scope}--${targetId}`);
      }
    });
  }

  return root.innerHTML;
}

/**
 * Готовит HTML к пагинации: вырезает блоки `[data-footnotes]` и извлекает тексты сносок,
 * заменяет метки сносок бейджами, переносит пустые якоря на абзац, чтобы не исчезли при нарезке.
 * При склейке нескольких текстов ключи заранее разводятся через `scopeReadingAnnotations`.
 */
export function prepareReadingHtml(html: string): PreparedReadingHtml {
  if (!ANNOTATION_HINT_RE.test(html)) {
    return { html, footnotes: {} };
  }

  const root = document.createElement("div");
  root.innerHTML = html;

  const footnotes: Record<string, string> = {};
  root.querySelectorAll("[data-footnotes]").forEach((section) => {
    section.querySelectorAll("li[data-fn]").forEach((li) => {
      const id = li.getAttribute("data-fn")?.trim();
      if (!id) return;
      const content = extractFootnoteContent(li);
      if (content) footnotes[id] = content;
    });
    section.remove();
  });

  root.querySelectorAll("sup.fn-ref[data-fn]").forEach((sup) => {
    const id = sup.getAttribute("data-fn")?.trim();
    if (!id || !footnotes[id]) return;
    const label = (sup.textContent || "").trim() || id.slice(id.lastIndexOf(":") + 1);
    attachToWord(sup, renderFootnoteBadge(label, id));
  });

  liftEmptyAnchors(root);

  return { html: root.innerHTML, footnotes };
}

export function htmlHasElementId(html: string, id: string): boolean {
  if (!id || !html.includes(id)) return false;
  const root = document.createElement("div");
  root.innerHTML = html;
  try {
    return !!root.querySelector(`[id="${CSS.escape(id)}"]`);
  } catch {
    return false;
  }
}

const actionFromElement = (node: Element): TextAction | null => {
  if (node.classList.contains("fn-badge")) {
    const id = node.getAttribute("data-fn");
    if (id) return { type: "footnote", id };
  }
  if (node instanceof HTMLAnchorElement) {
    const href = node.getAttribute("href");
    if (href?.startsWith("#") && href.length > 1) {
      const id = decodeFragment(href);
      if (id) return { type: "anchor", id };
    }
  }
  return null;
};

const ancestors = (target: EventTarget | null): Node[] => {
  const nodes: Node[] = [];
  let current = target instanceof Node ? target : null;
  while (current) {
    nodes.push(current);
    current = current.parentNode;
  }
  return nodes;
};

export function textActionFromEvent(event: Event): TextAction | null {
  const path = event.composedPath();
  const nodes = path.length > 0 ? path : ancestors(event.target);
  for (const node of nodes) {
    if (!(node instanceof Element)) continue;
    const action = actionFromElement(node);
    if (action) return action;
  }
  return null;
}
