import type { Request, Response, NextFunction } from 'express';
import { SUPPORTED_LANGUAGES, isRtl } from '../utils/i18n.js';

const SUPPORTED_CODES = SUPPORTED_LANGUAGES as unknown as string[];

declare global {
  namespace Express {
    interface Request {
      locale?: string;
      isRtl?: boolean;
    }
  }
}

export function localeMiddleware(req: Request, _res: Response, next: NextFunction) {
  const acceptLanguage = req.headers['accept-language'] || 'en';
  const preferredLang = req.cookies?.i18next;

  let detected = 'en';

  if (preferredLang && SUPPORTED_CODES.includes(preferredLang)) {
    detected = preferredLang;
  } else {
    const langs = acceptLanguage.split(',').map((l) => l.split(';')[0].trim().split('-')[0]);
    for (const l of langs) {
      if (SUPPORTED_CODES.includes(l)) {
        detected = l;
        break;
      }
    }
  }

  req.locale = detected;
  req.isRtl = isRtl(detected);
  next();
}

export function getLocaleFromPath(path: string): string {
  const parts = path.split('/');
  if (parts[1] && SUPPORTED_CODES.includes(parts[1])) {
    return parts[1];
  }
  return 'en';
}
