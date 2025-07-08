import { onUnmounted } from "vue";
import { f7 } from "framework7-vue";
import type { Toast } from "framework7/types";

export function useErrorToast({
  text,
  closeTimeout = 4000,
}: {
  text: string;
  closeTimeout?: number;
}) {
  
  let errorToast: Toast.Toast;

  const showErrorToast = () => {
    if (!errorToast) {
      errorToast = f7.toast.create({
        text,
        closeTimeout,
        position: "bottom",
        cssClass: "toast-error",
      });
    }
    errorToast.open();
  };

  onUnmounted(() => {
    if (errorToast) {
      errorToast.destroy();
    }
  });

  return {
    showErrorToast,
  };
}
