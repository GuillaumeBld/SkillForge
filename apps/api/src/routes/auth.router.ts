import { Router } from 'express';
import { v4 as uuid } from 'uuid';

import prisma from '../config/prisma';
import { ApiError } from '../middleware/error-handler';

const authRouter = Router();

authRouter.post('/token', async (req, res, next) => {
  try {
    const { grant_type: grantType, client_id: clientId, username } = req.body ?? {};

    if (!grantType || !clientId) {
      throw new ApiError('Missing required authentication parameters', 400);
    }

    if (grantType === 'password' && !username) {
      throw new ApiError('Username is required for password grant', 400);
    }

    const accessToken = uuid();
    const refreshToken = uuid();

    await prisma.user.upsert({
      where: { email: username ?? `${clientId}@placeholder.skillforge` },
      update: { updatedAt: new Date() },
      create: {
        email: username ?? `${clientId}@placeholder.skillforge`,
        firstName: 'Placeholder',
        lastName: 'User'
      }
    });

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: req.body?.scope ?? ''
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token: refreshToken } = req.body ?? {};

    if (!refreshToken) {
      throw new ApiError('Refresh token is required', 400);
    }

    res.json({
      access_token: uuid(),
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: req.body?.scope ?? ''
    });
  } catch (error) {
    next(error);
  }
});

export default authRouter;
