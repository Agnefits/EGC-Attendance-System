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

import { useState, useEffect, useCallback } from 'react';
import { notificationsService } from '../services';

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

      setNotifs(mapped);
    } catch (e) {
      console.error('Failed to load notifications', e);
      setNotifs([]);
    }
    // lang isn't needed for fetching (labels are bilingual in the payload),
    // but we keep user so it refetches on login/logout.
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const unread = notifs.filter((n) => n.unread).length;
  return { notifs, unread, reload: load };
}
