import HTTP from '../http';

export type ForgotPasswordPayload = {
  email: string;
};

export const authApi = {
  // Request password reset
  forgotPassword: (payload: ForgotPasswordPayload) => {
    return HTTP.POST<{ success: boolean }>('/api/auth/forgot-password', {
      body: payload,
    });
  },
};
