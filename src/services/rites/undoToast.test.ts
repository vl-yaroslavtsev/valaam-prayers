import { afterEach, beforeAll, describe, expect, it } from "vitest";
import Framework7 from "framework7/lite";
import Toast from "framework7/components/toast";
import type { Toast as ToastTypes } from "framework7/types";
import { syncUndoToast } from "./undoToast";

Framework7.use([Toast]);

type AppWithToast = Framework7 & {
  toast: { create(params: ToastTypes.Parameters): ToastTypes.Toast };
};

// Тост вешается на экземпляр приложения, а Framework7 не даёт создать второй
let app: AppWithToast;

function openToast(text: string): ToastTypes.Toast {
  const toast = app.toast.create({
    text,
    position: "bottom",
    closeButton: true,
    closeButtonText: "Отменить",
    destroyOnClose: true,
  });
  toast.open(false);
  return toast;
}

describe("syncUndoToast", () => {
  beforeAll(() => {
    const root = document.createElement("div");
    root.id = "undo-toast-app";
    document.body.append(root);
    app = new Framework7({ el: "#undo-toast-app", theme: "md" }) as AppWithToast;
  });

  afterEach(() => {
    document.querySelectorAll(".toast").forEach((el) => el.remove());
  });

  it("второе удаление меняет текст того же тоста", () => {
    let created = 0;
    const open = (text: string) => {
      created += 1;
      return openToast(text);
    };

    let current = syncUndoToast(null, 1, open);
    current = syncUndoToast(current, 2, open);

    const visible = document.querySelectorAll(".toast.modal-in");
    expect(created).toBe(1);
    expect(visible).toHaveLength(1);
    expect(visible[0].querySelector(".toast-text")?.textContent).toBe("Записки удалены");

    syncUndoToast(current, 0, open);
    expect(document.querySelectorAll(".toast.modal-in")).toHaveLength(0);
  });

  it("после закрытия следующая серия открывает новый тост", () => {
    const open = (text: string) => openToast(text);

    const first = syncUndoToast(null, 1, open);
    syncUndoToast(first, 0, open);
    syncUndoToast(null, 1, open);

    const visible = document.querySelectorAll(".toast.modal-in");
    expect(visible).toHaveLength(1);
    expect(visible[0].querySelector(".toast-text")?.textContent).toBe("Записка удалена");
  });

  it("destroy открытого тоста оставляет его на экране, поэтому серию так закрывать нельзя", () => {
    const toast = openToast("Записка удалена");
    toast.destroy();
    expect(document.querySelector(".toast.modal-in .toast-text")?.textContent).toBe("Записка удалена");
  });
});
