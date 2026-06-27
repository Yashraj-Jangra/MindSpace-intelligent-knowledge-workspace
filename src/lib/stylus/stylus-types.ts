export type PenSubtype = 'fountain' | 'ballpoint' | 'pencil';
export type StylusTool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'laser';
export type LineType = 'solid' | 'dashed' | 'dotted';
export type PressureCurve = 'linear' | 'soft' | 'hard';
export type SmoothingLevel = 'none' | 'mild' | 'high';
export type RecognizedShapeType =
  | 'rectangle'
  | 'square'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'arc'
  | 'none';

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
  type: 'endpoint' | 'vertex' | 'center' | 'radius' | 'handle';
}

export interface PerPenSettings {
  pencilDensity: number; // 0.2 to 1.0 graphite opacity factor
}

export interface VectorStroke {
  id: string;
  tool: StylusTool;
  penSubtype: PenSubtype;
  color: string;
  width: number;
  lineType: LineType;
  smoothing: SmoothingLevel;
  pencilDensity?: number;
  points: PointerPoint[];
  controlPoints?: ControlPoint[];
  recognizedShape?: RecognizedShapeType;
  shapeBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
    center?: { x: number; y: number };
    vertices?: { x: number; y: number }[];
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
  shapeHoldTimerMs: number; // 300ms to 1500ms
  enableShapeForPen: boolean;
  enableShapeForHighlighter: boolean;
  hapticsEnabled: boolean;
  hapticIntensity: 'light' | 'medium' | 'strong';
  pressureCurve: PressureCurve;
  smoothingLevel: SmoothingLevel;
  perPenSettings: PerPenSettings;
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
  shapeHoldTimerMs: 500, // 0.5s default hold timer
  enableShapeForPen: true,
  enableShapeForHighlighter: false,
  hapticsEnabled: true,
  hapticIntensity: 'medium',
  pressureCurve: 'linear',
  smoothingLevel: 'mild',
  perPenSettings: {
    pencilDensity: 0.85,
  },
  barrelButton1Action: 'toggle_eraser',
  barrelButton2Action: 'undo',
  eraserCapAction: 'clear_ink',
  xiaomiFocusButtonAction: 'convert_shape',
  doubleTapAction: 'cycle_color',
  squeezeAction: 'laser_pointer',
};
