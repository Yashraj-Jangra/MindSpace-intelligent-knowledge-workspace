import fs from 'fs';
import path from 'path';
import { prisma, isDbDisabled, disableDbCircuitBreaker } from './db';

const DATA_DIR = path.join(process.cwd(), '.data');
const SETTINGS_FILE = path.join(DATA_DIR, 'system-settings.json');

function ensureFileExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaultSettings: Record<string, string> = {
      SMTP_HOST: 'smtp.gmail.com',
      SMTP_PORT: '587',
      USER_STORAGE_LIMIT_MB: '100',
      AI_ENABLED: 'true',
      ALLOW_PUBLIC_REGISTRATION: 'true',
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  }
}

function readJsonSettings(): Record<string, string> {
  try {
    ensureFileExists();
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeJsonSettings(settings: Record<string, string>) {
  try {
    ensureFileExists();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[writeJsonSettings Error]:', err);
  }
}

export async function getSystemSetting(key: string): Promise<string | null> {
  if (!isDbDisabled()) {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key },
      });
      if (setting) return setting.value;
    } catch (error) {
      console.warn(`[getSystemSetting Error] Tripping circuit breaker for key ${key}:`, error);
      disableDbCircuitBreaker();
    }
  }

  const jsonSettings = readJsonSettings();
  return jsonSettings[key] || null;
}

export async function getSystemSettings(keys: string[]): Promise<Record<string, string>> {
  if (!isDbDisabled()) {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: { key: { in: keys } },
      });
      const result: Record<string, string> = {};
      for (const setting of settings) {
        result[setting.key] = setting.value;
      }
      return result;
    } catch (error) {
      console.warn('[getSystemSettings Error] Falling back to JSON store:', error);
      disableDbCircuitBreaker();
    }
  }

  const jsonSettings = readJsonSettings();
  const result: Record<string, string> = {};
  for (const k of keys) {
    if (jsonSettings[k] !== undefined) result[k] = jsonSettings[k];
  }
  return result;
}

export async function getAllSystemSettings(): Promise<Record<string, string>> {
  if (!isDbDisabled()) {
    try {
      const settings = await prisma.systemSetting.findMany();
      const result: Record<string, string> = {};
      for (const s of settings) {
        result[s.key] = s.value;
      }
      return result;
    } catch (error) {
      console.warn('[getAllSystemSettings Error]:', error);
      disableDbCircuitBreaker();
    }
  }

  return readJsonSettings();
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  if (!isDbDisabled()) {
    try {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    } catch (error) {
      console.warn(`[setSystemSetting Error] Falling back to JSON for key ${key}:`, error);
      disableDbCircuitBreaker();
    }
  }

  const jsonSettings = readJsonSettings();
  jsonSettings[key] = value;
  writeJsonSettings(jsonSettings);
}
