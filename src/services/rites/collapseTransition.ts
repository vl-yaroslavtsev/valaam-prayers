// Плавное появление и исчезновение элемента списка (хуки для TransitionGroup с :css="false"):
// высота, отступы и прозрачность схлопываются вместе, а отрицательный нижний отступ
// убирает зазор между элементами flex-списка, чтобы он не прыгал в конце.

export const COLLAPSE_MS = 250;
const COLLAPSE_EASING = "ease";
const COLLAPSE_PROPS = [
  "height",
  "padding-top",
  "padding-bottom",
  "border-top-width",
  "border-bottom-width",
  "margin-bottom",
  "opacity",
];

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function listGap(node: HTMLElement): number {
  return parseFloat(getComputedStyle(node.parentElement!).rowGap) || 0;
}

function setCollapsed(node: HTMLElement, gap: number): void {
  Object.assign(node.style, {
    height: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
    borderTopWidth: "0px",
    borderBottomWidth: "0px",
    marginBottom: `${-gap}px`,
    opacity: "0",
  });
}

function clearAnimationStyles(node: HTMLElement): void {
  [...COLLAPSE_PROPS, "overflow", "transition"].forEach((prop) => node.style.removeProperty(prop));
}

function startTransition(node: HTMLElement): void {
  node.style.overflow = "hidden";
  node.style.transition = COLLAPSE_PROPS.map(
    (prop) => `${prop} ${COLLAPSE_MS}ms ${COLLAPSE_EASING}`,
  ).join(", ");
}

/** Ждёт конец перехода высоты; запасной таймер нужен, если transitionend не придёт (например, вкладка в фоне) */
function afterCollapse(node: HTMLElement, callback: () => void): void {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(fallbackTimer);
    node.removeEventListener("transitionend", onEnd);
    callback();
  };
  const onEnd = (event: TransitionEvent) => {
    if (event.target === node && event.propertyName === "height") finish();
  };
  const fallbackTimer = setTimeout(finish, COLLAPSE_MS * 3);
  node.addEventListener("transitionend", onEnd);
}

export function onItemBeforeEnter(el: Element): void {
  (el as HTMLElement).style.opacity = "0";
}

export function onItemEnter(el: Element, done: () => void): void {
  const node = el as HTMLElement;
  if (prefersReducedMotion()) {
    clearAnimationStyles(node);
    done();
    return;
  }

  const gap = listGap(node);
  const height = node.offsetHeight;
  setCollapsed(node, gap);
  void node.offsetHeight;
  startTransition(node);
  // Отступы и границы возвращаются к значениям из стилей, высота растёт до естественной
  Object.assign(node.style, {
    height: `${height}px`,
    paddingTop: "",
    paddingBottom: "",
    borderTopWidth: "",
    borderBottomWidth: "",
    marginBottom: "",
    opacity: "1",
  });
  afterCollapse(node, () => {
    clearAnimationStyles(node);
    done();
  });
}

export function onItemLeave(el: Element, done: () => void): void {
  const node = el as HTMLElement;
  if (prefersReducedMotion()) {
    done();
    return;
  }

  const gap = listGap(node);
  node.style.height = `${node.offsetHeight}px`;
  void node.offsetHeight;
  startTransition(node);
  setCollapsed(node, gap);
  afterCollapse(node, done);
}
