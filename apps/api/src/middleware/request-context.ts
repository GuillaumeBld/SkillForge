import type { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}

declare module 'http' {
  interface IncomingMessage {
    requestId?: string;
  }
}

export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  const headerId = req.header('x-request-id');
  const requestId = headerId && headerId.trim().length > 0 ? headerId : uuid();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
};

export default requestContext;
