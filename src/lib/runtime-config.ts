declare global {
  interface Window {
    __ZHIJI_CONFIG__?: {
      API_URL?: string;
    };
  }
}

export function getRuntimeApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const runtimeValue = window.__ZHIJI_CONFIG__?.API_URL;
    if (runtimeValue) return runtimeValue;
  }
  return process.env.NEXT_PUBLIC_API_URL || '/api';
}

export {};
