// Scheduler polyfill for React 18
export function unstable_now() {
  return Date.now();
}

export function unstable_scheduleCallback(priority: any, callback: any, options?: any) {
  return setTimeout(callback, 0);
}

export function unstable_cancelCallback(callbackId: any) {
  clearTimeout(callbackId);
}

export function unstable_shouldYield() {
  return false;
}

export function unstable_requestPaint() {
  // No-op
}

export function unstable_runWithPriority(priority: any, callback: any) {
  return callback();
}

export function unstable_next(eventHandler: any) {
  return eventHandler();
}

export function unstable_wrapCallback(callback: any) {
  return callback;
}

export function unstable_getCurrentPriorityLevel() {
  return 0;
}

export function unstable_continueExecution() {
  // No-op
}

export function unstable_pauseExecution() {
  // No-op
}

export function unstable_getFirstCallbackNode() {
  return null;
}

export const unstable_IdlePriority = 5;
export const unstable_LowPriority = 4;
export const unstable_NormalPriority = 3;
export const unstable_UserBlockingPriority = 2;
export const unstable_ImmediatePriority = 1;
