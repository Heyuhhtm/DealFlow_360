import { Router } from 'express';
import { signup, login, portalMagicLink, getMe } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/errors';

const router = Router();

router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));
router.post('/portal-magic-link', asyncHandler(portalMagicLink));
router.get('/me', requireAuth, asyncHandler(getMe));

export default router;
