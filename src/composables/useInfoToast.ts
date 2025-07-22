import { onUnmounted, watch } from "vue";
import { f7 } from "framework7-vue";
import type { Toast } from "framework7/types";

export function useInfoToast({
  text,
  closeTimeout = 2000,
}: {
  text: string;
  closeTimeout?: number;
}) {
  
  let infoToast: Toast.Toast;


  const showInfoToast = () => {
    if (!infoToast) {
      infoToast = f7.toast.create({
        text,
        closeTimeout,
      });

      f7.once('pageBeforeOut', () => {
        infoToast.close();
      })
    }
    infoToast.open();
  };

  onUnmounted(() => {
    if (infoToast) {
      infoToast.close();
      infoToast.destroy();
    }
  });

  return {
    showInfoToast,
  };
}
