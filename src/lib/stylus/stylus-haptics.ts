import { StylusSettings } from './stylus-types';

export class StylusHaptics {
  private static isSupported(): boolean {
    return typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator;
  }

  public static trigger(
    type: 'strokeStart' | 'eraserScrub' | 'toolChange' | 'buttonTrigger' | 'shapeSnap' | 'elementSelected',
    settings?: StylusSettings
  ) {
    if (settings && !settings.hapticsEnabled) return;
    if (!this.isSupported()) return;

    const multiplier = settings?.hapticIntensity === 'light' ? 0.6 : settings?.hapticIntensity === 'strong' ? 1.5 : 1.0;

    try {
      switch (type) {
        case 'strokeStart':
          navigator.vibrate(Math.round(8 * multiplier));
          break;
        case 'eraserScrub':
          navigator.vibrate([Math.round(4 * multiplier), 4, Math.round(4 * multiplier)]);
          break;
        case 'toolChange':
          navigator.vibrate(Math.round(20 * multiplier));
          break;
        case 'buttonTrigger':
          navigator.vibrate([Math.round(12 * multiplier), 10, Math.round(12 * multiplier)]);
          break;
        case 'shapeSnap':
          navigator.vibrate([Math.round(15 * multiplier), 8, Math.round(25 * multiplier)]);
          break;
        case 'elementSelected':
          navigator.vibrate(Math.round(14 * multiplier));
          break;
      }
    } catch {
      // Ignore vibration errors if blocked by browser policy
    }
  }
}
