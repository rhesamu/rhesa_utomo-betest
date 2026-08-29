export interface TokenPayload {
  accountId: string;
  userId: string;
  userName: string;
  role?: string;
}

export interface ITokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
