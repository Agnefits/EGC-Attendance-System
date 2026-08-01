//using Microsoft.AspNetCore.Mvc;
//using System.Security.Claims;
//using Attendance_System.Models;
//using Attendance_System.Enums;
//using Attendance_System.Middleware;
//using Attendance_System.UnitOfWork;
//using Attendance_System.DTOs.Notifications;

//namespace Attendance_System.Controllers
//{
//    [Route("api/[controller]")]
//    [ApiController]
//    public class NotificationsController : ControllerBase
//    {
//        private readonly IUnitOfWork _unitOfWork;
//        private const int MonthlyPermissionMinutes = 240;

//        public NotificationsController(IUnitOfWork unitOfWork)
//        {
//            _unitOfWork = unitOfWork;
//        }

//        [HttpGet]
//        [AuthorizedRoles]
//        public async Task<IActionResult> Get()
//        {
//            var role = User.FindFirst(ClaimTypes.Role)?.Value;
//            var employeeId = User.FindFirst("EmployeeId")?.Value;
//            var list = new List<NotificationDto>();
//            var today = DateOnly.FromDateTime(DateTime.Today);

//            // Personal notifications (Employee + HR)
//            if ((role == "Employee" || role == "Hr") && !string.IsNullOrEmpty(employeeId))
//            {
//                var leaves = await _unitOfWork.LeaveRequests.GetByEmployeeIdAsync(employeeId);
//                var pendingLeaves = leaves.Count(l => l.Status == LeaveStatus.Pending);
//                if (pendingLeaves > 0)
using Attendance_System.DTOs.Notifications;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Models;
using Attendance_System.UnitOfWork;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

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
                var leaves = await _unitOfWork.LeaveRequests.GetByEmployeeIdAsync(employeeId);
                var pendingLeaves = leaves.Count(l => l.Status == LeaveStatus.Pending);
                if (pendingLeaves > 0)
                    list.Add(Note("pending_leaves", "warning", "إجازات معلقة", "Pending Leaves",
                        $"{pendingLeaves} طلب ينتظر الموافقة", $"{pendingLeaves} request(s) awaiting approval"));

                var (mStart, mEnd) = MonthPeriod(today);
                var usedPerms = await _unitOfWork.PermissionRequests.GetUsedMinutesByEmployeeAndDateRangeAsync(employeeId, mStart, mEnd);
                var remPerms = MonthlyPermissionMinutes - usedPerms;
                if (remPerms < 60 && remPerms >= 0)
                    list.Add(Note("perms_low", "danger", "رصيد الأذونات منخفض", "Low Permission Balance",
                        $"متبقي {remPerms} دقيقة فقط هذا الشهر", $"Only {remPerms} min left this month"));

                var leaveTypes = await _unitOfWork.LeaveTypes.GetAllAsync();
                var annualLimit = leaveTypes.FirstOrDefault(lt => lt.Id == "annual")?.MaxAnnualDays ?? 21;
                var (lyStart, lyEnd) = LeaveYearPeriod(today);
                var usedAnnual = await _unitOfWork.LeaveRequests.GetApprovedLeaveDaysByEmployeeAndTypeAsync(employeeId, "annual", lyStart, lyEnd);
                var remAnnual = annualLimit - usedAnnual;
                if (remAnnual <= 3 && remAnnual >= 0)
                    list.Add(Note("leave_low", "warning", "رصيد الإجازة الاعتيادية منخفض", "Low Annual Leave",
                        $"متبقي {remAnnual} يوم فقط", $"Only {remAnnual} days left"));

                var hasToday = await _unitOfWork.AttendanceLogs.ExistsForEmployeeOnDateAsync(employeeId, today);
                if (!hasToday)
                    list.Add(Note("no_checkin", "danger", "لم تسجل حضورك اليوم", "No Check-in Today",
                        "لا يوجد تسجيل حضور لهذا اليوم", "You have not checked in today"));
            }

            // Management notifications (Admin + HR)
            if (role == "Admin" || role == "Hr")
            {
                var allPendingLeaves = await _unitOfWork.LeaveRequests.GetPendingCountAsync();
                if (allPendingLeaves > 0)
                    list.Add(Note("admin_pending_leaves", "warning", "إجازات تنتظر الموافقة", "Leaves Awaiting Approval",
                        $"{allPendingLeaves} طلب معلق", $"{allPendingLeaves} pending requests"));

                var allPendingPerms = await _unitOfWork.PermissionRequests.GetPendingCountAsync();
                if (allPendingPerms > 0)
                    list.Add(Note("admin_pending_perms", "info", "أذونات تنتظر الموافقة", "Permissions Awaiting Approval",
                        $"{allPendingPerms} طلب معلق", $"{allPendingPerms} pending requests"));

                var consec = await GetConsecutiveAbsenteesCountAsync(today, null);
                if (consec > 0)
                    list.Add(Note("consec_absent", "danger", "غياب متتالي", "Consecutive Absences",
                        $"{consec} موظف غائب يومين متتاليين", $"{consec} employee(s) absent 2+ days"));
            }

            // Head notifications (dept-scoped)
            if (role == "Head" && !string.IsNullOrEmpty(employeeId))
            {
                var deptId = await _unitOfWork.Employees.GetDepartmentIdByEmployeeIdAsync(employeeId);

                if (!string.IsNullOrEmpty(deptId))
                {
                    var deptPendingLeaves = await _unitOfWork.LeaveRequests.GetPendingCountByDepartmentAsync(deptId);
                    if (deptPendingLeaves > 0)
                        list.Add(Note("head_pending_leaves", "warning", "إجازات معلقة في قسمك", "Pending Dept Leaves",
                            $"{deptPendingLeaves} طلب ينتظر موافقتك", $"{deptPendingLeaves} awaiting your approval"));

                    var deptPendingPerms = await _unitOfWork.PermissionRequests.GetPendingCountByDepartmentAsync(deptId);
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

        private async Task<int> GetConsecutiveAbsenteesCountAsync(DateOnly today, string? departmentId)
        {
            var offenders = await _unitOfWork.AttendanceLogs.GetConsecutiveAbsencesAsync(today, departmentId);
            return offenders
                .GroupBy(a => a.EmployeeId)
                .Count(g => g.Count() >= 2);
        }
    }
}