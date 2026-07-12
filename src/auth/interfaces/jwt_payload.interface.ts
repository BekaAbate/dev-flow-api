import { JwtPayload as BaseJwtPayload } from 'jsonwebtoken';

export interface JwtPayload extends BaseJwtPayload {
  email: string;
  sub: string;
  jti: string;
  exp: number;
  iat: number;
}
