import { Prisma } from '@prisma/client';
import { Router, type NextFunction } from 'express';

import prisma from '../config/prisma';
import { ApiError } from '../middleware/error-handler';
import { assessmentQueue } from '../workers';

const assessmentRouter = Router();

const handlePrismaError = (error: unknown, next: NextFunction) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      next(new ApiError('Assessment conflict', 409));
      return;
    }

    if (error.code === 'P2025') {
      next(new ApiError('Assessment not found', 404));
      return;
    }
  }

  next(error);
};

assessmentRouter.post('/users/:userId/assessments', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      assessment_template_id: templateCode,
      delivery_mode: deliveryMode,
      due_at: dueAt,
      notify_user: notifyUser = true
    } = req.body ?? {};

    if (!templateCode) {
      throw new ApiError('Assessment template is required', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const template = await prisma.assessmentTemplate.upsert({
      where: { code: templateCode },
      create: { code: templateCode, name: templateCode, deliveryMode },
      update: { deliveryMode }
    });

    const assessment = await prisma.assessment.create({
      data: {
        userId,
        templateId: template.id,
        status: 'scheduled',
        dueAt,
        notifyUser
      }
    });

    if (assessmentQueue) {
      await assessmentQueue.add('schedule', { assessmentId: assessment.id });
    }

    res.status(201).json({
      status: 'scheduled',
      assessment_id: assessment.id,
      launch_url: `https://skillforge.com/assess/${assessment.id}`,
      skills_benchmarked: []
    });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

assessmentRouter.get('/users/:userId/assessments', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, cursor, limit = '20' } = req.query;

    const take = Math.min(Number(limit), 100);

    const assessments = await prisma.assessment.findMany({
      where: {
        userId,
        ...(status ? { status: String(status) } : {})
      },
      take,
      ...(cursor ? { skip: 1, cursor: { id: String(cursor) } } : {}),
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      data: assessments,
      next_cursor: assessments.length === take ? assessments[assessments.length - 1].id : null
    });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

assessmentRouter.get('/users/:userId/assessments/:assessmentId', async (req, res, next) => {
  try {
    const { userId, assessmentId } = req.params;

    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, userId },
      include: { template: true }
    });

    if (!assessment) {
      throw new ApiError('Assessment not found', 404);
    }

    res.json({ status: 'success', data: assessment });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

assessmentRouter.patch('/users/:userId/assessments/:assessmentId', async (req, res, next) => {
  try {
    const { userId, assessmentId } = req.params;
    const { due_at: dueAt, notify_user: notifyUser } = req.body ?? {};

    const assessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        ...(dueAt ? { dueAt } : {}),
        ...(notifyUser !== undefined ? { notifyUser } : {})
      }
    });

    if (assessment.userId !== userId) {
      throw new ApiError('Assessment not found for user', 404);
    }

    res.json({ status: 'success', data: assessment });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

export default assessmentRouter;
