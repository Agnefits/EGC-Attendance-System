using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Data;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public NotificationsController(AppDbContext context) { _context = context; }

        private const int MonthlyPermissionMinutes = 240;

        // GET /api/notifications  — computed for the caller based on their role.
        // Mirrors the front-end useNotifications hook so both sides agree.
        [HttpGet]
        [AuthorizedRoles]
        public async Task<IActionResult> Get()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            var list = new List<object>();
            var today = DateOnly.FromDateTime(DateTime.Today);

            // ── Personal (Employee + HR) ──
            if ((role == "Employee" || role == "Hr") && !string.IsNullOrEmpty(employeeId))
            {
                var pendingLeaves = await _context.LeaveRequests
                    .CountAsync(l => l.EmployeeId == employeeId && l.Status == LeaveStatus.Pending);
                if (pendingLeaves > 0)
                    list.Add(Note("pending_leaves", "warning", "إجازات معلقة", "Pending Leaves",
                        $"{pendingLeaves} طلب ينتظر الموافقة", $"{pendingLeaves} request(s) awaiting approval", true));

                // Monthly permission balance
                var (mStart, mEnd) = MonthPeriod(today);
                var usedPerms = await _context.PermissionRequests
                    .Where(p => p.EmployeeId == employeeId && p.Status == LeaveStatus.Approved && p.Date >= mStart && p.Date <= mEnd)
                    .SumAsync(p => (int?)p.DurationMinutes) ?? 0;
                var remPerms = MonthlyPermissionMinutes - usedPerms;
                if (remPerms < 60 && remPerms >= 0)
                    list.Add(Note("perms_low", "danger", "رصيد الأذونات منخفض", "Low Permission Balance",
                        $"متبقي {remPerms} دقيقة فقط هذا الشهر", $"Only {remPerms} min left this month", true));

                // Annual leave balance (limit read from the leave type, fallback 21)
                var annualLimit = await _context.LeaveTypes
                    .Where(lt => lt.Id == "annual")
                    .Select(lt => (int?)lt.MaxAnnualDays)
                    .FirstOrDefaultAsync() ?? 21;
                var (lyStart, lyEnd) = LeaveYearPeriod(today);
                var usedAnnual = await _context.LeaveRequests
                    .Where(l => l.EmployeeId == employeeId && l.LeaveTypeId == "annual"
                                && l.Status == LeaveStatus.Approved && l.FromDate >= lyStart && l.FromDate <= lyEnd)
                    .SumAsync(l => (int?)l.DaysCount) ?? 0;
                var remAnnual = annualLimit - usedAnnual;
                if (remAnnual <= 3 && remAnnual >= 0)
                    list.Add(Note("leave_low", "warning", "رصيد الإجازة الاعتيادية منخفض", "Low Annual Leave",
                        $"متبقي {remAnnual} يوم فقط", $"Only {remAnnual} days left", true));

                // No check-in today
                var hasToday = await _context.AttendanceLogs.AnyAsync(a => a.EmployeeId == employeeId && a.Date == today);
                if (!hasToday)
                    list.Add(Note("no_checkin", "danger", "لم تسجل حضورك اليوم", "No Check-in Today",
                        "لا يوجد تسجيل حضور لهذا اليوم", "You have not checked in today", true));
            }

            // ── Management (Admin + HR) ──
            if (role == "Admin" || role == "Hr")
            {
                var allPendingLeaves = await _context.LeaveRequests.CountAsync(l => l.Status == LeaveStatus.Pending);
                if (allPendingLeaves > 0)
                    list.Add(Note("admin_pending_leaves", "warning", "إجازات تنتظر الموافقة", "Leaves Awaiting Approval",
                        $"{allPendingLeaves} طلب معلق", $"{allPendingLeaves} pending requests", true));

                var allPendingPerms = await _context.PermissionRequests.CountAsync(p => p.Status == LeaveStatus.Pending);
                if (allPendingPerms > 0)
                    list.Add(Note("admin_pending_perms", "info", "أذونات تنتظر الموافقة", "Permissions Awaiting Approval",
                        $"{allPendingPerms} طلب معلق", $"{allPendingPerms} pending requests", true));

                var consec = await ConsecutiveAbsenteesAsync(today, null);
                if (consec > 0)
                    list.Add(Note("consec_absent", "danger", "غياب متتالي", "Consecutive Absences",
                        $"{consec} موظف غائب يومين متتاليين", $"{consec} employee(s) absent 2+ days", true));
            }

            // ── Head (dept-scoped) ──
            if (role == "Head" && !string.IsNullOrEmpty(employeeId))
            {
                var deptId = await _context.Employees.Where(e => e.Id == employeeId).Select(e => e.DepartmentId).FirstOrDefaultAsync();

                var deptPendingLeaves = await _context.LeaveRequests.CountAsync(l => l.Status == LeaveStatus.Pending && l.Employee!.DepartmentId == deptId);
                if (deptPendingLeaves > 0)
                    list.Add(Note("head_pending_leaves", "warning", "إجازات معلقة في قسمك", "Pending Dept Leaves",
                        $"{deptPendingLeaves} طلب ينتظر موافقتك", $"{deptPendingLeaves} awaiting your approval", true));

                var deptPendingPerms = await _context.PermissionRequests.CountAsync(p => p.Status == LeaveStatus.Pending && p.Employee!.DepartmentId == deptId);
                if (deptPendingPerms > 0)
                    list.Add(Note("head_pending_perms", "info", "أذونات معلقة في قسمك", "Pending Dept Permissions",
                        $"{deptPendingPerms} طلب ينتظر موافقتك", $"{deptPendingPerms} awaiting your approval", true));
            }

            var unread = list.Count; // all emitted notes are unread by construction
            return Ok(new { success = true, unread, data = list });
        }

        private static object Note(string id, string type, string titleAr, string titleEn, string descAr, string descEn, bool unread) =>
            new
            {
                id,
                type,
                title = new { ar = titleAr, en = titleEn },
                desc = new { ar = descAr, en = descEn },
                unread
            };

        // Leave year: Jul 1 → Jun 30
        private static (DateOnly start, DateOnly end) LeaveYearPeriod(DateOnly today)
        {
            int y = today.Month >= 7 ? today.Year : today.Year - 1;
            return (new DateOnly(y, 7, 1), new DateOnly(y + 1, 6, 30));
        }

        private static (DateOnly start, DateOnly end) MonthPeriod(DateOnly today)
        {
            var start = new DateOnly(today.Year, today.Month, 1);
            var end = new DateOnly(today.Year, today.Month, DateTime.DaysInMonth(today.Year, today.Month));
            return (start, end);
        }

        private async Task<int> ConsecutiveAbsenteesAsync(DateOnly today, string? departmentId)
        {
            var yesterday = today.AddDays(-1);
            var dayBefore = today.AddDays(-2);

            var q = _context.AttendanceLogs
                .Where(a => (a.Date == yesterday || a.Date == dayBefore) && a.Status == AttendanceStatus.Absent);
            if (!string.IsNullOrEmpty(departmentId))
                q = q.Where(a => a.Employee!.DepartmentId == departmentId);

            return await q.GroupBy(a => a.EmployeeId).CountAsync(g => g.Count() >= 2);
        }
    }
}