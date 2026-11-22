// alarm.js — the alarm meter 0-100. It climbs while a guard or camera sees
// the thief and drains in shadow. At 70% the museum screams a warning; at
// 100% the thief is caught (fair: the warning comes first, with a grace
// window, and shadow always gives a way back down).

import { ALARM_MAX, ALARM_WARN, clamp } from './config.js';

export function createAlarm() {
  return { value: 0, peak: 0, warned: false, grace: 0 };
}

/**
 * Step the alarm. seenByGuard / seenByCamera are booleans for this frame.
 * Returns 'caught' when the meter hits 100 after its grace window.
 */
export function updateAlarm(alarm, seenByGuard, seenByCamera, inShadow, dt) {
  let rate = 0;
  if (seenByGuard) rate += 32;
  if (seenByCamera) rate += 24;
  if (rate === 0) rate = inShadow ? -16 : -7;
  alarm.value = clamp(alarm.value + rate * dt, 0, ALARM_MAX);
  if (alarm.value > alarm.peak) alarm.peak = alarm.value;
  if (alarm.value >= ALARM_WARN && !alarm.warned) {
    alarm.warned = true;
    alarm.grace = 1.2; // a beat of warning before the meter can finish you
  }
  if (alarm.value < ALARM_WARN - 10) alarm.warned = false;
  if (alarm.value >= ALARM_MAX) {
    if (alarm.grace > 0) {
      alarm.grace -= dt;
      alarm.value = ALARM_MAX - 0.5;
      return 'warning';
    }
    return 'caught';
  }
  return 'ok';
}

/** Add a flat chunk of alarm (EMP backlash). */
export function addAlarm(alarm, amount) {
  alarm.value = clamp(alarm.value + amount, 0, ALARM_MAX);
  if (alarm.value > alarm.peak) alarm.peak = alarm.value;
}

/** Alarm colour for the HUD meter. */
export function alarmColor(value) {
  if (value >= ALARM_WARN) return '#ef4444';
  if (value >= 40) return '#f59e0b';
  return '#22c55e';
}

export { ALARM_MAX, ALARM_WARN };
