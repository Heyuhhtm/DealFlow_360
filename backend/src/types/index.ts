import { UserRole } from '@prisma/client';

export interface AuthUserPayload {
  userId: string;
  role: UserRole;
  email?: string;
  name?: string;
}

export interface PortalAuthPayload {
  customerId: string;
  email?: string;
  type: 'portal';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      customer?: PortalAuthPayload;
    }
  }
}
