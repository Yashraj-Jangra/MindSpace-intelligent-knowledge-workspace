import { prisma } from './db';

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting ? setting.value : null;
  } catch (error) {
    console.error(`[getSystemSetting Error] Failed to read key ${key}:`, error);
    return null;
  }
}

export async function getSystemSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: keys },
      },
    });
    const result: Record<string, string> = {};
    for (const setting of settings) {
      result[setting.key] = setting.value;
    }
    return result;
  } catch (error) {
    console.error('[getSystemSettings Error]:', error);
    return {};
  }
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  try {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  } catch (error) {
    console.error(`[setSystemSetting Error] Failed to write key ${key}:`, error);
    throw error;
  }
}
