/**
 * useNotifications.js
 * Shared notifications hook — fetches live notifications from the API.
 * Place in: src/pages/useNotifications.js
 *
 * The backend (NotificationsController) returns:
 *   { success, unread, data: [ { id, type, title:{ar,en}, desc:{ar,en}, unread } ] }
 * It does NOT send display metadata (icon/color/time), so we derive those
 * from `type` here.
 */

<<<<<<< Updated upstream
import { useState, useEffect, useCallback } from 'react';
import { notificationsService } from '../services';
=======
import { useState, useEffect } from 'react';
import { notificationsService } from '../services';
import { LEAVES, PERMISSIONS, ATTENDANCE } from '../data';
import { getLeaveYearPeriod, getPermissionsPeriod } from './leaveValidation';
>>>>>>> Stashed changes

// Map notification "type" -> display icon + color used by the UI.
const TYPE_META = {
  danger:  { icon: '⚠️', c: '#DC2626' },
  warning: { icon: '📅', c: '#B45309' },
  info:    { icon: '⏱️', c: '#0891B2' },
  success: { icon: '✅', c: '#166534' },
};

// Per-id icon overrides so specific notifications keep their old icon.
const ICON_BY_ID = {
  perms_low: '⏱️', perms_balance: '⏱️',
  leave_low: '🌴', leave_balance: '🌴',
  no_checkin: '⚠️',
  admin_pending_perms: '⏱️', head_pending_perms: '⏱️',
  approved_leave: '✅',
};

export default function useNotifications({ user, lang }) {
  const [notifs, setNotifs] = useState([]);
<<<<<<< Updated upstream
=======
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  // جلب الإشعارات من الـ API
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const response = await notificationsService.getNotifications();
        
        // 🔴 التعامل مع الـ Response بشكل صحيح
        if (response && Array.isArray(response)) {
          setNotifs(response);
          setUnread(response.filter(n => n.unread).length);
        } else if (response && response.data && Array.isArray(response.data)) {
          setNotifs(response.data);
          setUnread(response.unread || response.data.filter(n => n.unread).length);
        } else {
          // Fallback: استخدم البيانات المحلية
          const localNotifs = generateLocalNotifications(user, lang);
          setNotifs(localNotifs);
          setUnread(localNotifs.filter(n => n.unread).length);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Fallback: استخدم البيانات المحلية
        const localNotifs = generateLocalNotifications(user, lang);
        setNotifs(localNotifs);
        setUnread(localNotifs.filter(n => n.unread).length);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user, lang]);

  // توليد إشعارات من البيانات المحلية (Fallback)
  const generateLocalNotifications = (user, lang) => {
    if (!user) return [];
    const list = [];
    const ar = lang === 'ar';
    const today = new Date().toISOString().slice(0, 10);
    const empId = user.employeeId;
>>>>>>> Stashed changes

  const load = useCallback(async () => {
    if (!user) { setNotifs([]); return; }
    try {
      const res = await notificationsService.getNotifications();
      // notificationsService returns res.data (the array). If a caller/config
      // returns the full body instead, unwrap defensively.
      const rows = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);

      const mapped = rows.map((n) => {
        const type = n.type ?? n.Type ?? 'info';
        const meta = TYPE_META[type] || TYPE_META.info;
        const title = n.title ?? n.Title ?? {};
        const desc = n.desc ?? n.Desc ?? {};
        return {
          id: n.id ?? n.Id,
          type,
          icon: ICON_BY_ID[n.id ?? n.Id] || meta.icon,
          c: meta.c,
          title: { ar: title.ar ?? title.Ar ?? '', en: title.en ?? title.En ?? '' },
          desc:  { ar: desc.ar  ?? desc.Ar  ?? '', en: desc.en  ?? desc.En  ?? '' },
          time:  { ar: 'الآن', en: 'Now' },
          unread: n.unread ?? n.Unread ?? true,
        };
      });

<<<<<<< Updated upstream
      setNotifs(mapped);
    } catch (e) {
      console.error('Failed to load notifications', e);
      setNotifs([]);
=======
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

      // Permissions balance
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
      } else {
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

      // Leave balance warning
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
>>>>>>> Stashed changes
    }
    // lang isn't needed for fetching (labels are bilingual in the payload),
    // but we keep user so it refetches on login/logout.
  }, [user]);

  useEffect(() => { load(); }, [load]);

<<<<<<< Updated upstream
  const unread = notifs.filter((n) => n.unread).length;
  return { notifs, unread, reload: load };
=======
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
      const dayBefore = new Date(today2); dayBefore.setDate(dayBefore.getDate() - 2);
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
  };

  return { notifs, unread, loading };
>>>>>>> Stashed changes
}