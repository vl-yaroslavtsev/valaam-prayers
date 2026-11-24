import { afterEach, describe, expect, it, vi } from "vitest";
import { useTextTap } from "./useTextTap";

const setup = (blocked = false) => {
  const options = {
    isBlocked: () => blocked,
    clearSelection: vi.fn(() => window.getSelection()?.removeAllRanges()),
    onAction: vi.fn(),
    onTap: vi.fn(),
  };
  const tap = useTextTap(options);
  return { options, tap };
};

const click = (target: Element, tap: ReturnType<typeof useTextTap>) => {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, clientX: 5, clientY: 7 });
  target.addEventListener("click", (e) => tap.handleClick(e as MouseEvent), { once: true });
  target.dispatchEvent(event);
  return event;
};

const pointerDown = (tap: ReturnType<typeof useTextTap>) =>
  tap.handlePointerDown({ isPrimary: true } as PointerEvent);

const selectText = (node: Node) => {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
};

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = "";
});

describe("useTextTap", () => {
  it("тап по тексту уходит в зоны экрана", () => {
    document.body.innerHTML = "<p>текст</p>";
    const { options, tap } = setup();
    click(document.querySelector("p")!, tap);
    expect(options.onTap).toHaveBeenCalledWith(5, 7);
    expect(options.onAction).not.toHaveBeenCalled();
  });

  it("тап по бейджу открывает сноску один раз и не листает страницу", () => {
    document.body.innerHTML = '<p>слово<span class="badge fn-badge" data-fn="1">1</span></p>';
    const { options, tap } = setup();
    const event = click(document.querySelector(".fn-badge")!, tap);
    expect(options.onAction).toHaveBeenCalledTimes(1);
    expect(options.onAction).toHaveBeenCalledWith({ type: "footnote", id: "1" });
    expect(options.onTap).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("при загрузке тап игнорируется, а сноска открывается", () => {
    document.body.innerHTML = '<p>т</p><span class="fn-badge" data-fn="1">1</span>';
    const { options, tap } = setup(true);
    click(document.querySelector("p")!, tap);
    click(document.querySelector(".fn-badge")!, tap);
    expect(options.onTap).not.toHaveBeenCalled();
    expect(options.onAction).toHaveBeenCalledTimes(1);
  });

  it("тап при прежнем выделении снимает его и ничего не открывает", () => {
    document.body.innerHTML = '<p>текст</p><span class="fn-badge" data-fn="1">1</span>';
    const { options, tap } = setup();
    selectText(document.querySelector("p")!);
    pointerDown(tap);
    click(document.querySelector(".fn-badge")!, tap);
    expect(options.clearSelection).toHaveBeenCalledTimes(1);
    expect(options.onAction).not.toHaveBeenCalled();
    expect(options.onTap).not.toHaveBeenCalled();
  });

  it("выделение, начатое этим же жестом, не снимается и не открывает сноску", () => {
    document.body.innerHTML = '<p>текст</p><span class="fn-badge" data-fn="1">1</span>';
    const { options, tap } = setup();
    pointerDown(tap);
    selectText(document.querySelector("p")!);
    click(document.querySelector(".fn-badge")!, tap);
    expect(options.clearSelection).not.toHaveBeenCalled();
    expect(options.onAction).not.toHaveBeenCalled();
    expect(options.onTap).not.toHaveBeenCalled();
  });
});
