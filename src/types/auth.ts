export interface User {
  id: number;
  email: string;
  isSuperadmin: boolean;
}

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  isSuperadmin: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}