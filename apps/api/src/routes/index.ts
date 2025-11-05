import { Router } from 'express';

import assessmentRouter from './assessment.router';
import authRouter from './auth.router';
import matchingRouter from './matching.router';
import notificationRouter from './notification.router';
import profileRouter from './profile.router';

const router = Router();

router.use('/auth', authRouter);
router.use('/', profileRouter);
router.use('/', assessmentRouter);
router.use('/', matchingRouter);
router.use('/', notificationRouter);

export default router;
