export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '',
  TIMEOUT: 30000, // 30 seconds
};

export function getDefaultHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  };
}
