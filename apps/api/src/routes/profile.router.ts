import { Router, type NextFunction } from 'express';

import prisma from '../config/prisma';
import cacheService from '../services/cache.service';
import { ApiError } from '../middleware/error-handler';

const profileRouter = Router();

const userCacheKey = (userId: string) => `user:${userId}`;

const isPrismaKnownRequestError = (error: unknown): error is { code: string } => {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as Record<string, unknown>).code === 'string'
  );
};

const handlePrismaError = (error: unknown, next: NextFunction) => {
  if (isPrismaKnownRequestError(error)) {
    if (error.code === 'P2002') {
      next(new ApiError('Duplicate resource', 409));
      return;
    }

    if (error.code === 'P2025') {
      next(new ApiError('User not found', 404));
      return;
    }
  }

  next(error);
};

profileRouter.post('/users', async (req, res, next) => {
  try {
    const {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      preferred_roles: preferredRoles = [],
      education,
      goals = [],
      marketing_opt_in: marketingOptIn = false
    } = req.body ?? {};

    if (!firstName || !lastName || !email) {
      throw new ApiError('Missing required onboarding fields', 422);
    }

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone,
        marketingOptIn,
        profile: {
          create: {
            preferredRoles,
            education,
            goals
          }
        }
      },
      include: {
        profile: true
      }
    });

    await cacheService.invalidate(userCacheKey(user.id));

    res.status(201).json({
      status: 'success',
      user_id: user.id,
      profile_completion: 0.35,
      required_actions: ['upload_resume', 'schedule_assessment']
    });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

profileRouter.get('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const cached = await cacheService.get<unknown>(userCacheKey(userId));

    if (cached) {
      res.json({ status: 'success', data: cached });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, assessments: true, notificationPrefs: true }
    });

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const response = {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      marketing_opt_in: user.marketingOptIn,
      profile: user.profile,
      assessments: user.assessments,
      notification_preferences: user.notificationPrefs
    };

    await cacheService.set(userCacheKey(user.id), response, 600);

    res.json({ status: 'success', data: response });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

profileRouter.patch('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { first_name: firstName, last_name: lastName, phone, marketing_opt_in: marketingOptIn } = req.body ?? {};

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(phone ? { phone } : {}),
        ...(marketingOptIn !== undefined ? { marketingOptIn } : {})
      },
      include: { profile: true }
    });

    await cacheService.invalidate(userCacheKey(userId));

    res.json({ status: 'success', data: user });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

profileRouter.post('/users/:userId/resumes', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { source, language } = req.body ?? {};

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const resume = await prisma.resumeIngestion.create({
      data: {
        userId,
        source,
        language,
        state: 'queued'
      }
    });

    res.status(202).json({
      status: 'processing',
      resume_id: resume.id,
      ingestion_state: resume.state,
      estimated_completion_seconds: 45
    });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

export default profileRouter;
