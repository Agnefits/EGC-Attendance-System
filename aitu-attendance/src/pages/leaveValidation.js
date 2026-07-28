/**
 * leaveValidation.js
 * Shared leave validation logic — used by Employeeleaves, HrLeaves, Headleaves
 * 
 * Place in: src/utils/leaveValidation.js
 */

import { ATTENDANCE, LEAVES } from '../data';


/**
 * Get current leave year period: July 1 → June 30
 * e.g. if today is March 2026 → period is 2025-07-01 to 2026-06-30
 *      if today is August 2026 → period is 2026-07-01 to 2027-06-30
 */
export function getLeaveYearPeriod() {
  const now = new Date();
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    start: `${y}-07-01`,
    end:   `${y + 1}-06-30`,
  };
}

/**
 * Get current permissions month period: first day of current month
 */
export function getPermissionsPeriod() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return {
    start: `${now.getFullYear()}-${m}-01`,
    end:   `${now.getFullYear()}-${m}-${new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()}`,
  };
}

/**
 * Calculate used leave days for a specific type within current leave year (July 1 → June 30)
 */
export function calcUsedLeaveDays(employeeId, leaveType, leavesArr) {
  const { start, end } = getLeaveYearPeriod();
  return leavesArr
    .filter(l =>
      l.employeeId === employeeId &&
      l.type === leaveType &&
      l.status === 'approved' &&
      l.from >= start &&
      l.from <= end
    )
    .reduce((s, l) => s + (l.days || 0), 0);
}

/**
 * Calculate used permissions minutes within current month
 */
export function calcUsedPermsMins(employeeId, permsArr) {
  const { start, end } = getPermissionsPeriod();
  return (permsArr || [])
    .filter(p =>
      p.employeeId === employeeId &&
      p.status === 'approved' &&
      p.date >= start &&
      p.date <= end
    )
    .reduce((s, p) => s + (p.duration || 0), 0);
}

/**
 * Count working days between two dates — excluding Fridays
 */
export function calcWorkDays(from, to) {
  let count = 0;
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    if (cur.getDay() !== 5) count++; // skip Friday
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Check if a date range contains a Friday (only for consecutive multi-day leaves)
 * Rule: Friday must NOT be counted in leave days — it's a weekend
 * If leave spans across Friday, Friday is skipped automatically
 */
export function hasFridayInRange(from, to) {
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    if (cur.getDay() === 5) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

/**
 * Returns week boundaries (Sun–Sat) for a given date string
 */
function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun
  const sun = new Date(d); sun.setDate(d.getDate() - day);
  const sat = new Date(d); sat.setDate(d.getDate() + (6 - day));
  return {
    start: sun.toISOString().slice(0, 10),
    end:   sat.toISOString().slice(0, 10),
  };
}

/**
 * Check if employee worked on Saturday in the same week as dateStr
 */
function workedSaturdayInWeek(employeeId, dateStr) {
  const { start, end } = getWeekRange(dateStr);
  return ATTENDANCE.some(a =>
    a.employeeId === employeeId &&
    a.date >= start &&
    a.date <= end &&
    new Date(a.date).getDay() === 6 && // Saturday
    (a.status === 'present' || a.status === 'late' || a.status === 'left')
  );
}

/**
 * Check if employee already has a compensatory leave in the same week
 */
function hasCompensatoryInWeek(employeeId, dateStr, excludeId = null) {
  const { start, end } = getWeekRange(dateStr);
  return LEAVES.some(l =>
    l.employeeId === employeeId &&
    l.type === 'compensatory' &&
    l.id !== excludeId &&
    l.from >= start &&
    l.from <= end &&
    l.status !== 'rejected'
  );
}

/**
 * Main validation function
 * @param {Object} params
 * @param {string} params.type         - Leave type id
 * @param {string} params.from         - Start date YYYY-MM-DD
 * @param {string} params.to           - End date YYYY-MM-DD
 * @param {string} params.employeeId   - Employee id
 * @param {string} params.lang         - 'ar' | 'en'
 * @param {boolean} params.grantedByAdmin - For grant type: was it approved by admin?
 * @param {string} [params.editId]     - If editing, exclude this id
 * @returns {string|null} - Error message or null if valid
 */
export function validateLeaveRequest({ type, from, to, employeeId, lang, grantedByAdmin = false, editId = null }) {
  const ar = lang === 'ar';

  // ── Basic date checks ──
  if (!from || !to) return ar ? 'اختر تاريخ البداية والنهاية' : 'Select start and end dates';
  if (new Date(to) < new Date(from)) return ar ? 'تاريخ النهاية قبل البداية' : 'End date before start date';

  const today = new Date().toISOString().slice(0, 10);

  // ── Urgent leave rules ──
  if (type === 'urgent') {
    const { start: weekStart, end: weekEnd } = getWeekRange(today);

    // Must be within current week only
    if (from < weekStart || from > weekEnd) {
      return ar
        ? 'الإجازة العارضة يجب أن تكون في نفس الأسبوع الحالي'
        : 'Urgent leave must be within the current week';
    }

    // Cannot be before today (can't request urgent leave for past day)
    if (from < today) {
      return ar
        ? 'لا يمكن طلب إجازة عارضة لأيام سابقة'
        : 'Cannot request urgent leave for past days';
    }
  }

  // ── Compensatory leave rules ──
  if (type === 'compensatory') {
    const { start: weekStart, end: weekEnd } = getWeekRange(from);

    // Must be within same week — cannot be before or after
    if (from < weekStart || from > weekEnd) {
      return ar
        ? 'إجازة بدل الراحة يجب أن تكون في نفس أسبوع يوم العمل'
        : 'Compensatory leave must be in the same week as the worked day';
    }

    // Employee must have worked on Saturday this week
    if (!workedSaturdayInWeek(employeeId, from)) {
      return ar
        ? 'لا يوجد سجل عمل يوم السبت في هذا الأسبوع'
        : 'No Saturday attendance record found for this week';
    }

    // Cannot already have a compensatory leave this week
    if (hasCompensatoryInWeek(employeeId, from, editId)) {
      return ar
        ? 'لديك بالفعل إجازة بدل راحة في هذا الأسبوع'
        : 'You already have a compensatory leave this week';
    }

    // Must be only 1 day
    if (from !== to) {
      return ar
        ? 'إجازة بدل الراحة يوم واحد فقط'
        : 'Compensatory leave is 1 day only';
    }
  }

  // ── Grant leave rules ──
  if (type === 'grant') {
    if (!grantedByAdmin) {
      return ar
        ? 'إجازة المنحة تُمنح فقط من قِبل الإدارة — لا يمكنك تقديم هذا الطلب'
        : 'Grant leave can only be issued by management';
    }
  }

  // ── Friday rule (all types) ──
  // From/To cannot be a Friday
  if (new Date(from).getDay() === 5) {
    return ar
      ? 'لا يمكن أن يبدأ الطلب يوم الجمعة — يوم الجمعة عطلة'
      : 'Leave cannot start on Friday — it is a weekend day';
  }
  if (new Date(to).getDay() === 5) {
    return ar
      ? 'لا يمكن أن ينتهي الطلب يوم الجمعة — يوم الجمعة عطلة'
      : 'Leave cannot end on Friday — it is a weekend day';
  }

  return null; // ✅ Valid
}

/**
 * Get leave type rules description (for UI hints)
 */
export function getLeaveTypeHint(typeId, lang) {
  const ar = lang === 'ar';
  const hints = {
    urgent: ar
      ? '⚡ نفس الأسبوع الحالي فقط · لا أيام سابقة · الجمعة لا تُحتسب'
      : '⚡ Current week only · No past days · Fridays excluded',
    compensatory: ar
      ? '🔄 يوم واحد فقط · نفس أسبوع عملك السبت · الجمعة لا تُحتسب'
      : '🔄 One day only · Same week you worked Saturday · Fridays excluded',
    grant: ar
      ? '🎁 تُمنح فقط من الإدارة — لا يمكنك تقديمها بنفسك'
      : '🎁 Issued by management only — you cannot apply',
    annual: ar
      ? '📅 الجمعة لا تُحتسب ضمن أيام الإجازة تلقائياً'
      : '📅 Fridays are automatically excluded from leave days',
    sick: ar
      ? '🏥 الجمعة لا تُحتسب ضمن أيام الإجازة تلقائياً'
      : '🏥 Fridays are automatically excluded from leave days',
  };
  return hints[typeId] || null;
}
