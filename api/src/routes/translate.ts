import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate, authorize } from '../middleware/auth.js';
import { getErrorInfo } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '../../locales');

const router = Router();

const ALLOWED_LANGS = ['en', 'ar', 'fr', 'es', 'id'];
const ALLOWED_NAMESPACES = ['common', 'auth', 'admin', 'landing', 'trading', 'dashboard', 'portfolio'];

function isValidLangCode(lang: string): boolean {
  return /^[a-z]{2}$/.test(lang) && ALLOWED_LANGS.includes(lang);
}

function isValidNamespace(ns: string): boolean {
  return /^[a-z_]+$/.test(ns) && ALLOWED_NAMESPACES.includes(ns);
}

interface TranslateRequest {
  sourceLang: string;
  targetLangs: string[];
  namespace: string;
  keys: Record<string, string>;
}

router.post('/translate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { sourceLang, targetLangs, namespace, keys } = req.body as TranslateRequest;

    if (!sourceLang || !targetLangs?.length || !namespace || !keys) {
      return res.status(400).json({ error: 'Missing required fields: sourceLang, targetLangs, namespace, keys' });
    }

    if (!isValidLangCode(sourceLang)) {
      return res.status(400).json({ error: 'Invalid sourceLang. Must be 2-letter language code.' });
    }

    if (!targetLangs.every(isValidLangCode)) {
      return res.status(400).json({ error: 'Invalid targetLangs. Must be 2-letter language codes.' });
    }

    if (!isValidNamespace(namespace)) {
      return res.status(400).json({ error: `Invalid namespace. Allowed: ${ALLOWED_NAMESPACES.join(', ')}` });
    }

    const safeLocalesDir = path.resolve(LOCALES_DIR);

    const results: Record<string, { written: number; errors: string[] }> = {};

    for (const targetLang of targetLangs) {
      const filePath = path.resolve(path.join(LOCALES_DIR, targetLang, `${namespace}.json`));

      if (!filePath.startsWith(safeLocalesDir)) {
        return res.status(400).json({ error: 'Invalid path detected.' });
      }

      const errors: string[] = [];
      let existing: Record<string, unknown> = {};

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        existing = JSON.parse(content);
      } catch {
        // File doesn't exist yet — start fresh
      }

      let written = 0;
      for (const [key, value] of Object.entries(keys)) {
        if (!existing[key]) {
          existing[key] = `[AUTO:${sourceLang}→${targetLang}] ${value}`;
          written++;
        }
      }

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(existing, null, 2), 'utf-8');

      results[targetLang] = { written, errors };
    }

    return res.json({ success: true, results });
  } catch (error: unknown) {
    const { message } = getErrorInfo(error);
    console.error('[AutoTranslate] Error:', message);
    return res.status(500).json({ error: 'Translation pipeline failed' });
  }
});

export default router;
