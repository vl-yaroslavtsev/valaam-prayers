/**
 * Сноски и якоря внутри текста читалки.
 * Метки сносок приходят как <sup class="fn-ref" data-fn="1">1</sup>,
 * переходы по тексту — как <a href="#v-a"> на пустой <a id="v-a"></a>.
 */

import { h, render } from "vue";
import { f7Badge } from "framework7-vue";

export type TextAction =
  | { type: "footnote"; id: string }
  | { type: "anchor"; id: string };

const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "LI", "DIV"]);
const WORD_JOINER = "\u2060";

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

/** f7-badge — span: внутри <p> он не разрывает абзац, в отличие от div у f7-chip. */
const renderFootnoteBadge = (label: string, id: string): HTMLElement | null => {
  const host = document.createElement("div");
  render(
    h(
      f7Badge,
      {
        class: "fn-badge",
        role: "button",
        "data-fn": id,
        "aria-label": `Сноска ${label}`,
      },
      () => label,
    ),
    host,
  );
  const badge = host.firstElementChild?.cloneNode(true);
  render(null, host);
  return badge instanceof HTMLElement ? badge : null;
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

const replaceFootnoteRefs = (root: HTMLElement, footnotes: Record<string, string>): void => {
  root.querySelectorAll("sup.fn-ref").forEach((sup) => {
    const id = sup.getAttribute("data-fn");
    if (!id || !footnotes[id]) return;
    const label = (sup.textContent || id).trim() || id;
    const badge = renderFootnoteBadge(label, id);
    if (badge) attachToWord(sup, badge);
  });
};

/**
 * Готовит HTML к пагинации: метки сносок становятся бейджами,
 * пустые якоря переезжают на абзац, чтобы не исчезнуть при нарезке.
 */
export function prepareReadingHtml(html: string, footnotes: Record<string, string> = {}): string {
  const hasFootnotes = Object.keys(footnotes).length > 0;
  if (!hasFootnotes && !/<a\b[^>]*\sid=/.test(html)) return html;

  const root = document.createElement("div");
  root.innerHTML = html;
  if (hasFootnotes) replaceFootnoteRefs(root, footnotes);
  liftEmptyAnchors(root);
  return root.innerHTML;
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
      let id = href.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        // в адресе остаётся как есть
      }
      if (id) return { type: "anchor", id };
    }
  }
  return null;
};

export function textActionFromEvent(event: Event): TextAction | null {
  const path = event.composedPath();
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    const action = actionFromElement(node);
    if (action) return action;
  }
  // После завершения события composedPath пуст: идём от target вверх по DOM.
  if (path.length === 0 && event.target instanceof Node) {
    let current: Node | null = event.target;
    while (current) {
      if (current instanceof Element) {
        const action = actionFromElement(current);
        if (action) return action;
      }
      current = current.parentNode;
    }
  }
  return null;
}
