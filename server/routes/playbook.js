// Serve the static caller playbook (company/product brief) to any signed-in user.
import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { PLAYBOOK } from '../lib/playbook.js';

const router = Router();
router.get('/', requireAuth, (_req, res) => res.json(PLAYBOOK));
export default router;
