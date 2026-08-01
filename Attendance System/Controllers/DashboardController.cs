using Attendance_System.DTOs.Dashboard;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Models;
using Attendance_System.UnitOfWork;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public DashboardController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        [AuthorizedRoles]
        public async Task<IActionResult> Get()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var employeeId = User.FindFirst("EmployeeId")?.Value;

            return role switch
            {
                "Admin" or "Hr" => Ok(new { success = true, data = await BuildManagementAsync() }),
                "Head" => Ok(new { success = true, data = await BuildHeadAsync(employeeId) }),
                "Employee" => Ok(new { success = true, data = await BuildEmployeeAsync(employeeId) }),
                _ => Unauthorized(new { success = false, message = "Unknown role" })
            };
        }

        private async Task<DashboardDto> BuildManagementAsync()
        {
            var today = DateOnly.FromDateTime(DateTime.Today);

            var statusCounts = await _unitOfWork.AttendanceLogs.GetStatusCountsAsync(null, null, null);
            var todayCounts = await _unitOfWork.AttendanceLogs.GetStatusCountsAsync(today, today, null);

            var total = statusCounts.Values.Sum();
            var present = statusCounts.GetValueOrDefault(AttendanceStatus.Present, 0) +
                          statusCounts.GetValueOrDefault(AttendanceStatus.Left, 0);
            var absent = statusCounts.GetValueOrDefault(AttendanceStatus.Absent, 0);
            var late = statusCounts.GetValueOrDefault(AttendanceStatus.Late, 0);

            var deptSummary = await _unitOfWork.AttendanceLogs.GetDepartmentAttendanceSummaryAsync(null, null);

            var departments = deptSummary.Values
                .Select(d => new DepartmentPerformanceDto
                {
                    DepartmentId = d.DepartmentId,
                    Department = d.DepartmentName,
                    Present = d.Present,
                    Absent = d.Absent,
                    Late = d.Late,
                    Pct = (int)Math.Round(d.AttendanceRate)
                })
                .OrderByDescending(d => d.Pct)
                .ToList();

            var todayPresent = todayCounts.GetValueOrDefault(AttendanceStatus.Present, 0) +
                               todayCounts.GetValueOrDefault(AttendanceStatus.Left, 0);
            var todayAbsent = todayCounts.GetValueOrDefault(AttendanceStatus.Absent, 0);
            var todayLate = todayCounts.GetValueOrDefault(AttendanceStatus.Late, 0);

            return new DashboardDto
            {
                Overall = new OverallDto
                {
                    Present = present,
                    Absent = absent,
                    Late = late,
                    Rate = total > 0 ? (int)Math.Round((double)present / total * 100) : 0
                },
                Today = new TodayDto
                {
                    Present = todayPresent,
                    Absent = todayAbsent,
                    Late = todayLate
                },
                PendingLeaves = await _unitOfWork.LeaveRequests.GetPendingCountAsync(),
                PendingPermissions = await _unitOfWork.PermissionRequests.GetPendingCountAsync(),
                OnLeaveToday = await _unitOfWork.LeaveRequests.GetApprovedLeavesOnDateAsync(today),
                Departments = departments,
                ConsecutiveAbsences = await GetConsecutiveAbsencesAsync(today, null)
            };
        }

        private async Task<HeadDashboardDto> BuildHeadAsync(string? employeeId)
        {
            var deptId = await _unitOfWork.Employees.GetDepartmentIdByEmployeeIdAsync(employeeId!);
            if (deptId == null)
                return new HeadDashboardDto();

            var today = DateOnly.FromDateTime(DateTime.Today);

            var statusCounts = await _unitOfWork.AttendanceLogs.GetStatusCountsAsync(null, null, deptId);
            var todayCounts = await _unitOfWork.AttendanceLogs.GetStatusCountsAsync(today, today, deptId);

            var total = statusCounts.Values.Sum();
            var present = statusCounts.GetValueOrDefault(AttendanceStatus.Present, 0) +
                          statusCounts.GetValueOrDefault(AttendanceStatus.Left, 0);
            var absent = statusCounts.GetValueOrDefault(AttendanceStatus.Absent, 0);
            var late = statusCounts.GetValueOrDefault(AttendanceStatus.Late, 0);

            var todayPresent = todayCounts.GetValueOrDefault(AttendanceStatus.Present, 0) +
                               todayCounts.GetValueOrDefault(AttendanceStatus.Left, 0);
            var todayAbsent = todayCounts.GetValueOrDefault(AttendanceStatus.Absent, 0);
            var todayLate = todayCounts.GetValueOrDefault(AttendanceStatus.Late, 0);

            return new HeadDashboardDto
            {
                DepartmentId = deptId,
                EmployeesCount = await _unitOfWork.Employees.GetActiveEmployeesCountByDepartmentAsync(deptId),
                Overall = new OverallDto
                {
                    Present = present,
                    Absent = absent,
                    Late = late,
                    Rate = total > 0 ? (int)Math.Round((double)present / total * 100) : 0
                },
                PendingLeaves = await _unitOfWork.LeaveRequests.GetPendingCountByDepartmentAsync(deptId),
                PendingPermissions = await _unitOfWork.PermissionRequests.GetPendingCountByDepartmentAsync(deptId),
                ConsecutiveAbsences = await GetConsecutiveAbsencesAsync(today, deptId)
            };
        }

        private async Task<EmployeeDashboardDto> BuildEmployeeAsync(string? employeeId)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var monthStart = new DateOnly(today.Year, today.Month, 1);

            var myLogs = await _unitOfWork.AttendanceLogs.GetByEmployeeWithDateRangeAsync(employeeId!, null, null);

            var present = myLogs.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left);
            var absent = myLogs.Count(a => a.Status == AttendanceStatus.Absent);
            var late = myLogs.Count(a => a.Status == AttendanceStatus.Late);

            var todayRecord = myLogs
                .Where(a => a.Date == today)
                .Select(a => new TodayRecordDto
                {
                    Status = a.Status,
                    CheckIn = a.CheckIn,
                    CheckOut = a.CheckOut
                })
                .FirstOrDefault();

            var monthPresentDays = await _unitOfWork.AttendanceLogs.GetCountByEmployeeAndDateRangeAsync(employeeId!, monthStart, today);

            var leaves = await _unitOfWork.LeaveRequests.GetByEmployeeIdAsync(employeeId!);

            return new EmployeeDashboardDto
            {
                Attendance = new AttendanceStatsDto
                {
                    Present = present,
                    Absent = absent,
                    Late = late
                },
                Today = todayRecord,
                MonthPresentDays = monthPresentDays,
                PendingLeaves = leaves.Count(l => l.Status == LeaveStatus.Pending),
                ApprovedLeaves = leaves.Count(l => l.Status == LeaveStatus.Approved),
                UsedPermissionMinutes = await _unitOfWork.PermissionRequests.GetUsedMinutesByEmployeeAndDateRangeAsync(employeeId!, monthStart, today)
            };
        }

        private async Task<ConsecutiveAbsencesDto> GetConsecutiveAbsencesAsync(DateOnly today, string? departmentId)
        {
            var offenders = await _unitOfWork.AttendanceLogs.GetConsecutiveAbsencesAsync(today, departmentId);

            var result = offenders
                .GroupBy(a => new { a.EmployeeId, Name = a.Employee?.Name ?? string.Empty })
                .Select(g => new ConsecutiveAbsentEmployeeDto
                {
                    EmployeeId = g.Key.EmployeeId,
                    Name = g.Key.Name
                })
                .ToList();

            return new ConsecutiveAbsencesDto
            {
                Count = result.Count,
                Employees = result
            };
        }
    }
}