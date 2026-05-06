import { Request } from 'express';
import { UserRole } from '../../user/role.enum';

export type AuthenticatedRequest = Request & {
    user: {
        sub: number;
        email: string;
        role: UserRole;
    };
};