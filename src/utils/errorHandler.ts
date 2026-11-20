interface ApiErrorShape {
  response?: {
    status?: number;
    data?: {
      message?: string | string[];
      code?: string;
    };
  };
  message?: string;
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const apiErr = error as ApiErrorShape;
    const responseMessage = apiErr.response?.data?.message;
    if (Array.isArray(responseMessage) && responseMessage.length > 0) {
      return String(responseMessage[0]);
    }
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage;
    }
    if (typeof apiErr.message === 'string' && apiErr.message.trim()) {
      return apiErr.message;
    }
  }
  return fallback;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    return (error as ApiErrorShape).response?.status;
  }
  return undefined;
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null) {
    const code = (error as ApiErrorShape).response?.data?.code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}
