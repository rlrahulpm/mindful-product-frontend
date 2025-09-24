import api from './api';
import { AuthResponse, LoginRequest } from '../types/auth';
import { ValidateTokenResponse, SetPasswordRequest, PasswordSetSuccessResponse } from '../types/admin';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },


  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refreshToken(): Promise<AuthResponse> {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  setAuthToken(token: string) {
    localStorage.setItem('token', token);
  },

  removeAuthToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getStoredToken(): string | null {
    return localStorage.getItem('token');
  },

  getStoredUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  setStoredUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  async verifyToken(token: string): Promise<ValidateTokenResponse> {
    const response = await api.get(`/auth/verify-token/${token}`);
    return response.data;
  },

  async setPassword(request: SetPasswordRequest): Promise<PasswordSetSuccessResponse> {
    const response = await api.post('/auth/set-password', request);
    return response.data;
  }
};