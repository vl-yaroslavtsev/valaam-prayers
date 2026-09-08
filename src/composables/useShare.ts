import { onUnmounted } from "vue";
import { f7 } from "framework7-vue";
import type { Toast } from "framework7/types";

export interface SharePayload {
  title: string;
  url: string;
}

const BASE_URL = "https://app.valaam.ru/webview/";

export function getShareUrl(url: string) {
  return `${BASE_URL}#view-prayers:${url}`;
}

export function useShare() {
  let toast: Toast.Toast | null = null;

  const showToast = (text: string) => {
    if (!toast) {
      toast = f7.toast.create({
        text,
        closeTimeout: 2000,
      });
    }
    toast.open();
  };

  const shareToVK = (item: SharePayload) => {
    const shareUrl = getShareUrl(item.url);
    const url = `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(item.title)}`;
    window.open(url, "_blank");
  };

  const shareToOK = (item: SharePayload) => {
    const shareUrl = getShareUrl(item.url);
    const url = `https://connect.ok.ru/offer?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(item.title)}`;
    window.open(url, "_blank");
  };

  const shareToWhatsApp = (item: SharePayload) => {
    const shareUrl = getShareUrl(item.url);
    const text = `${item.title} ${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const shareToTelegram = (item: SharePayload) => {
    const shareUrl = getShareUrl(item.url);
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(item.title)}`;
    window.open(url, "_blank");
  };

  const copyLink = async (item: SharePayload): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(getShareUrl(item.url));
      showToast("Ссылка скопирована");
      return true;
    } catch (err) {
      console.error("Ошибка копирования:", err);
      return false;
    }
  };

  onUnmounted(() => {
    if (toast) {
      toast.destroy();
      toast = null;
    }
  });

  return {
    shareToVK,
    shareToOK,
    shareToWhatsApp,
    shareToTelegram,
    copyLink,
  };
}
