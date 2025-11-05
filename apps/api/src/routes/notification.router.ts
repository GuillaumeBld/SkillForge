import { Prisma } from '@prisma/client';
import { Router, type NextFunction } from 'express';

import prisma from '../config/prisma';
import { ApiError } from '../middleware/error-handler';
import { notificationQueue } from '../workers';

const notificationRouter = Router();

const handlePrismaError = (error: unknown, next: NextFunction) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      next(new ApiError('Notification not found', 404));
      return;
    }
  }

  next(error);
};

notificationRouter.get('/users/:userId/notifications', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { channel, status, limit = '25', cursor } = req.query;

    const take = Math.min(Number(limit), 100);

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(channel ? { channel: String(channel) } : {}),
        ...(status ? { status: String(status) } : {})
      },
      take,
      ...(cursor ? { skip: 1, cursor: { id: String(cursor) } } : {}),
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      status: 'success',
      notifications,
      next_cursor: notifications.length === take ? notifications[notifications.length - 1].id : null
    });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

notificationRouter.patch('/users/:userId/notifications/:notificationId', async (req, res, next) => {
  try {
    const { userId, notificationId } = req.params;
    const { status } = req.body ?? {};

    if (!status) {
      throw new ApiError('status is required', 400);
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { status }
    });

    if (notification.userId !== userId) {
      throw new ApiError('Notification not found', 404);
    }

    res.json({ status: 'success', notification });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

notificationRouter.put('/users/:userId/notification-preferences', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { channels, quiet_hours: quietHours } = req.body ?? {};

    const preference = await prisma.notificationPreference.upsert({
      where: { userId },
      update: { channels, quietHours },
      create: { userId, channels, quietHours }
    });

    if (notificationQueue) {
      await notificationQueue.add('preference-updated', {
        userId,
        channel: 'email',
        template: 'preference_updated',
        data: { channels }
      });
    }

    res.json({ status: 'success', preferences: preference });
  } catch (error) {
    handlePrismaError(error, next);
  }
});

export default notificationRouter;
