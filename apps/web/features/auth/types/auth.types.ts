export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  company: { id: string; name: string };
  roles: string[];
  permissions: string[];
};

export type AuthTokens = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthState = {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionError: string | null;
};
