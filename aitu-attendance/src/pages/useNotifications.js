/**
 * useNotifications.js
 * Shared notifications hook — works for all roles
 * Place in: src/pages/useNotifications.js
 */

import { useMemo } from 'react';
import { LEAVES, PERMISSIONS, ATTENDANCE } from '../data';
import { getLeaveYearPeriod, getPermissionsPeriod } from './leaveValidation';

const MONTHLY_PERMS = 240;

export default function useNotifications({ user, lang }) {
  const notifs = useMemo(() => {
    if (!user) return [];
    const list = [];
    const ar = lang === 'ar';
    const today = new Date().toISOString().slice(0, 10);
    const empId = user.employeeId;

    // ─────────────────────────────────────────
    // 1. EMPLOYEE / HR notifications (personal)
    // ─────────────────────────────────────────
    if (user.role === 'employee' || user.role === 'hr') {

      // Pending leave requests
      const pendingLeaves = LEAVES.filter(l => l.employeeId === empId && l.status === 'pending');
      if (pendingLeaves.length > 0) {
        list.push({
          id: 'pending_leaves',
          icon: '📅',
          title: { ar: 'إجازات معلقة', en: 'Pending Leaves' },
          desc: { ar: `${pendingLeaves.length} طلب ينتظر الموافقة`, en: `${pendingLeaves.length} request(s) awaiting approval` },
          time: { ar: 'الآن', en: 'Now' },
          c: '#B45309',
          unread: true,
          type: 'warning',
        });
      }

      // Approved leave recently
      const recentApproved = LEAVES.filter(l =>
        l.employeeId === empId &&
        l.status === 'approved' &&
        l.from >= today
      );
      if (recentApproved.length > 0) {
        list.push({
          id: 'approved_leave',
          icon: '✅',
          title: { ar: 'تمت الموافقة على إجازتك', en: 'Leave Approved' },
          desc: { ar: `إجازة من ${recentApproved[0].from} إلى ${recentApproved[0].to}`, en: `From ${recentApproved[0].from} to ${recentApproved[0].to}` },
          time: { ar: 'مؤخراً', en: 'Recently' },
          c: '#166534',
          unread: false,
          type: 'success',
        });
      }

      // Permissions balance low (< 60 min left)
      const { start: pStart, end: pEnd } = getPermissionsPeriod();
      const usedPerms = (PERMISSIONS || [])
        .filter(p => p.employeeId === empId && p.status === 'approved' && p.date >= pStart && p.date <= pEnd)
        .reduce((s, p) => s + (p.duration || 0), 0);
      const remPerms = MONTHLY_PERMS - usedPerms;
      if (remPerms < 60 && remPerms >= 0) {
        list.push({
          id: 'perms_low',
          icon: '⏱️',
          title: { ar: 'رصيد الأذونات منخفض', en: 'Low Permission Balance' },
          desc: { ar: `متبقي ${remPerms} دقيقة فقط هذا الشهر`, en: `Only ${remPerms} min left this month` },
          time: { ar: 'هذا الشهر', en: 'This month' },
          c: '#DC2626',
          unread: true,
          type: 'danger',
        });
      } else if (remPerms >= 60) {
        list.push({
          id: 'perms_balance',
          icon: '⏱️',
          title: { ar: 'رصيد الأذونات الشهري', en: 'Monthly Permissions' },
          desc: { ar: `متبقي ${remPerms} دقيقة من ${MONTHLY_PERMS}`, en: `${remPerms} of ${MONTHLY_PERMS} min remaining` },
          time: { ar: 'هذا الشهر', en: 'This month' },
          c: '#0891B2',
          unread: false,
          type: 'info',
        });
      }

      // Leave balance warning (< 3 days)
      const { start: lyStart, end: lyEnd } = getLeaveYearPeriod();
      const usedAnnual = LEAVES
        .filter(l => l.employeeId === empId && l.type === 'annual' && l.status === 'approved' && l.from >= lyStart && l.from <= lyEnd)
        .reduce((s, l) => s + (l.days || 0), 0);
      const remAnnual = 21 - usedAnnual;
      if (remAnnual <= 3 && remAnnual >= 0) {
        list.push({
          id: 'leave_low',
          icon: '🌴',
          title: { ar: 'رصيد الإجازة الاعتيادية منخفض', en: 'Low Annual Leave' },
          desc: { ar: `متبقي ${remAnnual} يوم فقط`, en: `Only ${remAnnual} days left` },
          time: { ar: 'هذه السنة', en: 'This year' },
          c: '#B45309',
          unread: true,
          type: 'warning',
        });
      } else {
        list.push({
          id: 'leave_balance',
          icon: '🌴',
          title: { ar: 'رصيد الإجازة الاعتيادية', en: 'Annual Leave Balance' },
          desc: { ar: `متبقي ${remAnnual} يوم من 21`, en: `${remAnnual} of 21 days left` },
          time: { ar: 'هذه السنة', en: 'This year' },
          c: '#1565C0',
          unread: false,
          type: 'info',
        });
      }

      // Today's attendance
      const todayAtt = ATTENDANCE.find(a => a.employeeId === empId && a.date === today);
      if (!todayAtt) {
        list.push({
          id: 'no_checkin',
          icon: '⚠️',
          title: { ar: 'لم تسجل حضورك اليوم', en: 'No Check-in Today' },
          desc: { ar: 'لا يوجد تسجيل حضور لهذا اليوم', en: 'You have not checked in today' },
          time: { ar: 'اليوم', en: 'Today' },
          c: '#DC2626',
          unread: true,
          type: 'danger',
        });
      }
    }

    // ─────────────────────────────────────────
    // 2. ADMIN / HR notifications (management)
    // ─────────────────────────────────────────
    if (user.role === 'admin' || user.role === 'hr') {

      // Pending leaves from all employees
      const allPendingLeaves = LEAVES.filter(l => l.status === 'pending');
      if (allPendingLeaves.length > 0) {
        list.push({
          id: 'admin_pending_leaves',
          icon: '📅',
          title: { ar: 'إجازات تنتظر الموافقة', en: 'Leaves Awaiting Approval' },
          desc: { ar: `${allPendingLeaves.length} طلب معلق`, en: `${allPendingLeaves.length} pending requests` },
          time: { ar: 'الآن', en: 'Now' },
          c: '#B45309',
          unread: true,
          type: 'warning',
        });
      }

      // Pending permissions
      const allPendingPerms = (PERMISSIONS || []).filter(p => p.status === 'pending');
      if (allPendingPerms.length > 0) {
        list.push({
          id: 'admin_pending_perms',
          icon: '⏱️',
          title: { ar: 'أذونات تنتظر الموافقة', en: 'Permissions Awaiting Approval' },
          desc: { ar: `${allPendingPerms.length} طلب معلق`, en: `${allPendingPerms.length} pending requests` },
          time: { ar: 'الآن', en: 'Now' },
          c: '#0891B2',
          unread: true,
          type: 'info',
        });
      }

      // Employees absent 2+ consecutive days
      const today2 = new Date(today);
      const yesterday = new Date(today2); yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore  = new Date(today2); dayBefore.setDate(dayBefore.getDate() - 2);
      const yStr = yesterday.toISOString().slice(0, 10);
      const dbStr = dayBefore.toISOString().slice(0, 10);
      const absences = ATTENDANCE.filter(a =>
        (a.date === yStr || a.date === dbStr) && a.status === 'absent'
      );
      const consecAbsent = [...new Set(absences.map(a => a.employeeId))].filter(eid =>
        absences.filter(a => a.employeeId === eid).length >= 2
      );
      if (consecAbsent.length > 0) {
        list.push({
          id: 'consec_absent',
          icon: '⚠️',
          title: { ar: 'غياب متتالي', en: 'Consecutive Absences' },
          desc: { ar: `${consecAbsent.length} موظف غائب يومين متتاليين`, en: `${consecAbsent.length} employee(s) absent 2+ days` },
          time: { ar: 'اليوم', en: 'Today' },
          c: '#DC2626',
          unread: true,
          type: 'danger',
        });
      }
    }

    // ─────────────────────────────────────────
    // 3. HEAD notifications
    // ─────────────────────────────────────────
    if (user.role === 'head_department') {

      const deptPendingLeaves = LEAVES.filter(l => l.status === 'pending');
      if (deptPendingLeaves.length > 0) {
        list.push({
          id: 'head_pending_leaves',
          icon: '📅',
          title: { ar: 'إجازات معلقة في قسمك', en: 'Pending Dept Leaves' },
          desc: { ar: `${deptPendingLeaves.length} طلب ينتظر موافقتك`, en: `${deptPendingLeaves.length} awaiting your approval` },
          time: { ar: 'الآن', en: 'Now' },
          c: '#B45309',
          unread: true,
          type: 'warning',
        });
      }

      const deptPendingPerms = (PERMISSIONS || []).filter(p => p.status === 'pending');
      if (deptPendingPerms.length > 0) {
        list.push({
          id: 'head_pending_perms',
          icon: '⏱️',
          title: { ar: 'أذونات معلقة في قسمك', en: 'Pending Dept Permissions' },
          desc: { ar: `${deptPendingPerms.length} طلب ينتظر موافقتك`, en: `${deptPendingPerms.length} awaiting your approval` },
          time: { ar: 'الآن', en: 'Now' },
          c: '#0891B2',
          unread: true,
          type: 'info',
        });
      }
    }

    return list;
  }, [user, lang]);

  const unread = notifs.filter(n => n.unread).length;
  return { notifs, unread };
}
