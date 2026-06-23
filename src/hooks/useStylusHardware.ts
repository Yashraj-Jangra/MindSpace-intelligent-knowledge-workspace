'use client';

import { useEffect, useCallback } from 'react';
import { StylusSettings, StylusButtonAction } from '@/lib/stylus/stylus-types';
import { StylusHaptics } from '@/lib/stylus/stylus-haptics';

interface UseStylusHardwareOptions {
  settings: StylusSettings;
  onExecuteAction: (action: StylusButtonAction) => void;
}

export function useStylusHardware({ settings, onExecuteAction }: UseStylusHardwareOptions) {
  const triggerAction = useCallback(
    (action: StylusButtonAction) => {
      if (action === 'select_tool') return;
      StylusHaptics.trigger('buttonTrigger', settings);
      onExecuteAction(action);
    },
    [onExecuteAction, settings]
  )

  useEffect(() => {
    // PointerEvent listener for hardware buttons & eraser tip
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'pen') return;

      // 1. Samsung S-Pen / Surface Pen Tail Eraser Cap Detection (button 5 or buttons 32)
      if (e.button === 5 || e.buttons === 32) {
        triggerAction(settings.eraserCapAction);
        return;
      }

      // 2. Barrel Button 1 (button 2 or buttons 2)
      if (e.button === 2 || e.buttons === 2) {
        e.preventDefault();
        triggerAction(settings.barrelButton1Action);
        return;
      }

      // 3. Barrel Button 2 (button 1 or buttons 4)
      if (e.button === 1 || e.buttons === 4) {
        e.preventDefault();
        triggerAction(settings.barrelButton2Action);
        return;
      }
    };

    // Keyboard Event listener for Xiaomi Focus Pen Pro spotlight key & Air Gestures
    const handleKeyDown = (e: KeyboardEvent) => {
      // Xiaomi Focus Pen Pro sends custom key codes: F13/F14 or 'FocusKey' / 'PenSqueeze' / 'PageDown'
      if (e.code === 'F13' || e.key === 'FocusKey' || e.code === 'PageDown') {
        if (e.ctrlKey || e.shiftKey) {
          triggerAction(settings.squeezeAction);
        } else {
          triggerAction(settings.xiaomiFocusButtonAction);
        }
      }

      // Apple Pencil Double Tap / Squeeze custom shortcut bindings (Shift+F12)
      if (e.code === 'F12' && e.shiftKey) {
        triggerAction(settings.doubleTapAction);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [settings, triggerAction]);
}
