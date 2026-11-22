import { toast } from 'react-toastify';
import api from '../api';
import i18n from '../i18n';
import { extractApiErrorMessage } from './errorHandler';

export async function downloadUserFinancialData(params?: {
  userId?: string;
}): Promise<boolean> {
  try {
    // Utiliza POST sem parâmetros pessoais em URL (conformidade LGPD / prevenção de vazamento em logs de proxy)
    const response = await api.post('/users/me/export', {});

    const data = response.data;
    if (
      params?.userId &&
      data?.securityVerification?.userId &&
      data.securityVerification.userId !== params.userId
    ) {
      toast.error(i18n.t('modals.download.securityBlock'));
      return false;
    }

    const formattedJson = JSON.stringify(data, null, 2);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `financas-backup-${dateStamp}.json`;

    const rnWebView = (
      window as unknown as {
        ReactNativeWebView?: { postMessage: (msg: string) => void };
      }
    ).ReactNativeWebView;

    if (rnWebView && typeof rnWebView.postMessage === 'function') {
      rnWebView.postMessage(
        JSON.stringify({
          type: 'DOWNLOAD_BACKUP',
          filename,
          content: formattedJson,
        }),
      );
      toast.success(i18n.t('modals.download.mobileReady'));
      return true;
    }

    const jsonBlob = new Blob([formattedJson], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(i18n.t('modals.download.success'));
    return true;
  } catch (error: unknown) {
    toast.error(
      extractApiErrorMessage(error, i18n.t('modals.download.error')),
    );
    return false;
  }
}
