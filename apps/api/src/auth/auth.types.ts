export interface AccessTokenPayload {
  sub: string;
  authVersion: number;
}

export interface RefreshTokenPayload extends AccessTokenPayload {
  jti: string;
}

export interface AuthenticatedUser {
  userId: string;
  companyId: string;
  name: string;
  email: string;
  authVersion: number;
}
