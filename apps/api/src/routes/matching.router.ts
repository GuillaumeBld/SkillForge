import { Router } from 'express';

import prisma from '../config/prisma';
import cacheService from '../services/cache.service';
import { ApiError } from '../middleware/error-handler';

const matchingRouter = Router();

type MatchesResponse = {
  status: string;
  user_id: string;
  type: string;
  next_cursor: string | null;
  results: Array<{
    id: string;
    title: string;
    match_score: number;
    top_skills: Array<{ name: string; source: string }>;
    onet_code: string;
    source_reference: string;
  }>;
};

matchingRouter.get('/users/:userId/matches', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { type, limit = '20', cursor } = req.query;

    if (!type || !['jobs', 'courses', 'mentors'].includes(String(type))) {
      throw new ApiError('Missing or invalid match type', 400);
    }

    const cacheKey = `matches:${userId}:${type}:${cursor ?? 'start'}:${limit}`;
    const cached = await cacheService.get<MatchesResponse>(cacheKey);

    if (cached) {
      res.json(cached);
      return;
    }

    const take = Math.min(Number(limit), 100);

    const occupations = await prisma.occupation.findMany({
      take,
      ...(cursor ? { skip: 1, cursor: { id: String(cursor) } } : {}),
      orderBy: { jobOutlookPercent: 'desc' }
    });

    const payload: MatchesResponse = {
      status: 'success',
      user_id: userId,
      type: String(type),
      next_cursor: occupations.length === take ? occupations[occupations.length - 1].id : null,
      results: occupations.map((occupation) => ({
        id: occupation.id,
        title: occupation.title,
        match_score: 0.8,
        top_skills: occupation.alternativeTitles.slice(0, 3).map((skill) => ({ name: skill, source: 'JAAT' })),
        onet_code: occupation.onetCode,
        source_reference: 'JAAT Toolkit'
      }))
    };

    await cacheService.set(cacheKey, payload, 300);

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

matchingRouter.get('/users/:userId/dashboard', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [user, completedAssessments] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
      prisma.assessment.count({ where: { userId, status: 'completed' } })
    ]);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    res.json({
      status: 'success',
      sections: {
        summary: {
          profile_completion: user.profile ? 0.68 : 0.35,
          last_active: user.updatedAt.toISOString()
        },
        skills: {
          strengths: user.profile?.preferredRoles ?? [],
          gaps: [],
          source_citations: ['JAAT Toolkit', 'O*NET Resource Center']
        },
        assessments: {
          completed: completedAssessments
        }
      },
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

matchingRouter.get('/jaat-data', async (req, res, next) => {
  try {
    const { user_id: userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      throw new ApiError('user_id is required', 400);
    }

    res.json({
      status: 'success',
      jaat_data: {
        vector_version: '2025-04-10',
        feature_weights: {
          textual_skill_python: 0.83,
          textual_skill_sql: 0.78
        },
        source_reference: 'JAAT Toolkit & NLx Corpus'
      }
    });
  } catch (error) {
    next(error);
  }
});

export default matchingRouter;
