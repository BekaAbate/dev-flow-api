import { JwtPayload } from 'src/auth/interfaces/jwt_payload.interface';

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}
export {};
