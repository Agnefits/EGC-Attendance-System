using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.DTOs.Notifications;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NotificationsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private const int MonthlyPermissionMinutes = 240;

        public NotificationsController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        [AuthorizedRoles]
        public async Task<IActionResult> Get()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            var list = new List<NotificationDto>();
            var today = DateOnly.FromDateTime(DateTime.Today);

            // Personal notifications (Employee + HR)
            if ((role == "Employee" || role == "Hr") && !string.IsNullOrEmpty(employeeId))
            {
                var pendingLeaves = await _unitOfWork.LeaveRequests.Query()
                    .CountAsync(l => l.EmployeeId == employeeId && l.Status == LeaveStatus.Pending);
                if (pendingLeaves > 0)
                    list.Add(Note("pending_leaves", "warning", "إجازات معلقة", "Pending Leaves",
                        $"{pendingLeaves} طلب ينتظر الموافقة", $"{pendingLeaves} request(s) awaiting approval"));

                var (mStart, mEnd) = MonthPeriod(today);
                var usedPerms = await _unitOfWork.PermissionRequests.Query()
                    .Where(p => p.EmployeeId == employeeId && p.Status == LeaveStatus.Approved && p.Date >= mStart && p.Date <= mEnd)
                    .SumAsync(p => (int?)p.DurationMinutes) ?? 0;
                var remPerms = MonthlyPermissionMinutes - usedPerms;
                if (remPerms < 60 && remPerms >= 0)
                    list.Add(Note("perms_low", "danger", "رصيد الأذونات منخفض", "Low Permission Balance",
                        $"متبقي {remPerms} دقيقة فقط هذا الشهر", $"Only {remPerms} min left this month"));

                var annualLimit = await _unitOfWork.LeaveTypes.Query()
                    .Where(lt => lt.Id == "annual")
                    .Select(lt => (int?)lt.MaxAnnualDays)
                    .FirstOrDefaultAsync() ?? 21;
                var (lyStart, lyEnd) = LeaveYearPeriod(today);
                var usedAnnual = await _unitOfWork.LeaveRequests.Query()
                    .Where(l => l.EmployeeId == employeeId && l.LeaveTypeId == "annual"
                                && l.Status == LeaveStatus.Approved && l.FromDate >= lyStart && l.FromDate <= lyEnd)
                    .SumAsync(l => (int?)l.DaysCount) ?? 0;
                var remAnnual = annualLimit - usedAnnual;
                if (remAnnual <= 3 && remAnnual >= 0)
                    list.Add(Note("leave_low", "warning", "رصيد الإجازة الاعتيادية منخفض", "Low Annual Leave",
                        $"متبقي {remAnnual} يوم فقط", $"Only {remAnnual} days left"));

                var hasToday = await _unitOfWork.AttendanceLogs.Query()
                    .AnyAsync(a => a.EmployeeId == employeeId && a.Date == today);
                if (!hasToday)
                    list.Add(Note("no_checkin", "danger", "لم تسجل حضورك اليوم", "No Check-in Today",
                        "لا يوجد تسجيل حضور لهذا اليوم", "You have not checked in today"));
            }

            // Management notifications (Admin + HR)
            if (role == "Admin" || role == "Hr")
            {
                var allPendingLeaves = await _unitOfWork.LeaveRequests.Query()
                    .CountAsync(l => l.Status == LeaveStatus.Pending);
                if (allPendingLeaves > 0)
                    list.Add(Note("admin_pending_leaves", "warning", "إجازات تنتظر الموافقة", "Leaves Awaiting Approval",
                        $"{allPendingLeaves} طلب معلق", $"{allPendingLeaves} pending requests"));

                var allPendingPerms = await _unitOfWork.PermissionRequests.Query()
                    .CountAsync(p => p.Status == LeaveStatus.Pending);
                if (allPendingPerms > 0)
                    list.Add(Note("admin_pending_perms", "info", "أذونات تنتظر الموافقة", "Permissions Awaiting Approval",
                        $"{allPendingPerms} طلب معلق", $"{allPendingPerms} pending requests"));

                var consec = await ConsecutiveAbsenteesAsync(today, null);
                if (consec > 0)
                    list.Add(Note("consec_absent", "danger", "غياب متتالي", "Consecutive Absences",
                        $"{consec} موظف غائب يومين متتاليين", $"{consec} employee(s) absent 2+ days"));
            }

            // Head notifications (dept-scoped)
            if (role == "Head" && !string.IsNullOrEmpty(employeeId))
            {
                var deptId = await _unitOfWork.Employees.Query()
                    .Where(e => e.Id == employeeId)
                    .Select(e => e.DepartmentId)
                    .FirstOrDefaultAsync();

                if (!string.IsNullOrEmpty(deptId))
                {
                    var deptPendingLeaves = await _unitOfWork.LeaveRequests.Query()
                        .CountAsync(l => l.Status == LeaveStatus.Pending && l.Employee!.DepartmentId == deptId);
                    if (deptPendingLeaves > 0)
                        list.Add(Note("head_pending_leaves", "warning", "إجازات معلقة في قسمك", "Pending Dept Leaves",
                            $"{deptPendingLeaves} طلب ينتظر موافقتك", $"{deptPendingLeaves} awaiting your approval"));

                    var deptPendingPerms = await _unitOfWork.PermissionRequests.Query()
                        .CountAsync(p => p.Status == LeaveStatus.Pending && p.Employee!.DepartmentId == deptId);
                    if (deptPendingPerms > 0)
                        list.Add(Note("head_pending_perms", "info", "أذونات معلقة في قسمك", "Pending Dept Permissions",
                            $"{deptPendingPerms} طلب ينتظر موافقتك", $"{deptPendingPerms} awaiting your approval"));
                }
            }

            var unread = list.Count;
            return Ok(new
            {
                success = true,
                unread,
                data = list
            });
        }

        private static NotificationDto Note(string id, string type, string titleAr, string titleEn, string descAr, string descEn)
        {
            return new NotificationDto
            {
                Id = id,
                Type = type,
                Title = new NotificationTitleDto { Ar = titleAr, En = titleEn },
                Desc = new NotificationDescDto { Ar = descAr, En = descEn },
                Unread = true
            };
        }

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

            var q = _unitOfWork.AttendanceLogs.Query()
                .Where(a => (a.Date == yesterday || a.Date == dayBefore) && a.Status == AttendanceStatus.Absent);

            if (!string.IsNullOrEmpty(departmentId))
                q = q.Where(a => a.Employee!.DepartmentId == departmentId);

            return await q.GroupBy(a => a.EmployeeId).CountAsync(g => g.Count() >= 2);
        }
    }
}