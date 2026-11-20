import { toast } from 'react-toastify';
import api from '../api';
import { extractApiErrorMessage } from './errorHandler';
import { onlyDigits } from './formatters';

export async function downloadUserFinancialData(params?: {
  userId?: string;
  cpf?: string | null;
}): Promise<boolean> {
  const cleanCpf = onlyDigits(params?.cpf);

  try {
    const response = await api.get('/users/me/export', {
      params: cleanCpf ? { cpf: cleanCpf } : undefined,
    });

    const data = response.data;
    if (
      params?.userId &&
      data?.securityVerification?.userId &&
      data.securityVerification.userId !== params.userId
    ) {
      toast.error(
        'Bloqueio de segurança: divergência no identificador do usuário (CPF + ID).',
      );
      return false;
    }

    const formattedJson = JSON.stringify(data, null, 2);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const cpfSuffix = cleanCpf ? `-${cleanCpf.slice(-4)}` : '';
    const filename = `financas-dados${cpfSuffix}-${dateStamp}.json`;

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
      toast.success('Relatório completo (CPF + ID) pronto para salvar/compartilhar!');
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

    toast.success('Dados financeiros vinculados ao seu CPF + ID baixados com sucesso!');
    return true;
  } catch (error: unknown) {
    toast.error(
      extractApiErrorMessage(
        error,
        'Erro ao baixar dados financeiros vinculados ao seu CPF',
      ),
    );
    return false;
  }
}
