import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const LOCALES_DIR = join(__dirname, '../i18n/locales')
const NAMESPACES = ['common', 'admin', 'auth', 'trading', 'dashboard']
const LANGUAGES = ['en', 'ar', 'fr', 'es', 'id']

function loadJson(lang: string, ns: string): Record<string, unknown> {
  const filePath = join(LOCALES_DIR, lang, `${ns}.json`)
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}

describe('i18n key parity', () => {
  for (const ns of NAMESPACES) {
    const enKeys = flattenKeys(loadJson('en', ns))

    for (const lang of LANGUAGES.filter((l) => l !== 'en')) {
      it(`${lang}/${ns}.json should have all ${enKeys.length} keys from en/${ns}.json`, () => {
        const langKeys = flattenKeys(loadJson(lang, ns))
        const enSet = new Set(enKeys)
        const missing = langKeys.filter((k) => !enSet.has(k))
        expect(missing).toEqual([])
      })

      it(`${lang}/${ns}.json should not have extra keys missing from en/${ns}.json`, () => {
        const langKeys = flattenKeys(loadJson(lang, ns))
        const langSet = new Set(langKeys)
        const extra = enKeys.filter((k) => !langSet.has(k))
        expect(extra).toEqual([])
      })
    }
  }
})
