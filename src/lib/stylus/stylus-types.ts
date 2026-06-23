export type PenSubtype = 'ballpoint' | 'fountain' | 'pencil';
export type StylusTool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'laser';
export type LineType = 'solid' | 'dashed' | 'dotted';
export type PressureCurve = 'linear' | 'soft' | 'hard';
export type SmoothingLevel = 'none' | 'mild' | 'high';
export type RecognizedShapeType = 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'diamond' | 'line' | 'arrow' | 'none';

export type StylusButtonAction =
  | 'toggle_eraser'
  | 'undo'
  | 'redo'
  | 'cycle_color'
  | 'laser_pointer'
  | 'pan_workspace'
  | 'clear_ink'
  | 'convert_shape'
  | 'convert_text'
  | 'select_tool';

export interface PointerPoint {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  timeStamp: number;
}

export interface ControlPoint {
  id: string;
  x: number;
  y: number;
  type: 'endpoint' | 'vertex' | 'center' | 'handle';
}

export interface VectorStroke {
  id: string;
  tool: StylusTool;
  penSubtype: PenSubtype;
  color: string;
  width: number;
  lineType: LineType;
  smoothing: SmoothingLevel;
  points: PointerPoint[];
  controlPoints?: ControlPoint[];
  recognizedShape?: RecognizedShapeType;
  shapeBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  };
  anchorElementId?: string;
  createdAt: number;
  isSelected?: boolean;
}

export interface StylusSettings {
  isStylusModeActive: boolean;
  enablePalmRejection: boolean;
  autoShapeRecognition: boolean;
  hapticsEnabled: boolean;
  hapticIntensity: 'light' | 'medium' | 'strong';
  pressureCurve: PressureCurve;
  smoothingLevel: SmoothingLevel;
  // Hardware button mappings
  barrelButton1Action: StylusButtonAction;
  barrelButton2Action: StylusButtonAction;
  eraserCapAction: StylusButtonAction;
  xiaomiFocusButtonAction: StylusButtonAction;
  doubleTapAction: StylusButtonAction;
  squeezeAction: StylusButtonAction;
}

export const DEFAULT_STYLUS_SETTINGS: StylusSettings = {
  isStylusModeActive: true,
  enablePalmRejection: true,
  autoShapeRecognition: true,
  hapticsEnabled: true,
  hapticIntensity: 'medium',
  pressureCurve: 'linear',
  smoothingLevel: 'mild',
  barrelButton1Action: 'toggle_eraser',
  barrelButton2Action: 'undo',
  eraserCapAction: 'clear_ink',
  xiaomiFocusButtonAction: 'convert_shape',
  doubleTapAction: 'cycle_color',
  squeezeAction: 'laser_pointer',
};
