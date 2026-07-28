'use client';

import { useSocket } from './useSocket';

export function useTaskPressure(onAlert: (data: { taskId: string; title: string; dueAt: string }) => void) {
  useSocket('task:overdue', onAlert);
}
