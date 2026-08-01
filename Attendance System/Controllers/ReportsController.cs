using Attendance_System.DTOs.Reports;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Models;
using Attendance_System.UnitOfWork;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Text;
using System.Threading.Tasks;
using System.Linq;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public ReportsController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet("summary")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> Summary(
            [FromQuery] DateOnly? from,
            [FromQuery] DateOnly? to,
            [FromQuery] string? departmentId)
        {
            var statusCounts = await _unitOfWork.AttendanceLogs.GetStatusCountsAsync(from, to, departmentId);

            var total = statusCounts.Values.Sum();
            var present = statusCounts.GetValueOrDefault(AttendanceStatus.Present, 0) +
                          statusCounts.GetValueOrDefault(AttendanceStatus.Left, 0);
            var absent = statusCounts.GetValueOrDefault(AttendanceStatus.Absent, 0);
            var late = statusCounts.GetValueOrDefault(AttendanceStatus.Late, 0);

            var today = DateOnly.FromDateTime(DateTime.Today);
            var todayCounts = await _unitOfWork.AttendanceLogs.GetStatusCountsAsync(today, today, departmentId);

            var todayPresent = todayCounts.GetValueOrDefault(AttendanceStatus.Present, 0) +
                               todayCounts.GetValueOrDefault(AttendanceStatus.Left, 0);
            var todayAbsent = todayCounts.GetValueOrDefault(AttendanceStatus.Absent, 0);
            var todayLate = todayCounts.GetValueOrDefault(AttendanceStatus.Late, 0);

            var totalEmployees = await _unitOfWork.Employees.GetActiveEmployeesCountAsync();
            if (!string.IsNullOrEmpty(departmentId))
                totalEmployees = await _unitOfWork.Employees.GetActiveEmployeesCountByDepartmentAsync(departmentId);

            var onLeaveToday = await _unitOfWork.LeaveRequests.GetApprovedLeavesOnDateAsync(today);

            return Ok(new
            {
                success = true,
                data = new ReportSummaryDto
                {
                    TotalEmployees = totalEmployees,
                    Range = new RangeDto { From = from, To = to },
                    Present = present,
                    Absent = absent,
                    Late = late,
                    AttendanceRate = total > 0 ? (int)Math.Round((double)present / total * 100) : 0,
                    Today = new TodaySummaryDto
                    {
                        Present = todayPresent,
                        Absent = todayAbsent,
                        Late = todayLate
                    },
                    PendingLeaves = await _unitOfWork.LeaveRequests.GetPendingCountAsync(),
                    PendingPermissions = await _unitOfWork.PermissionRequests.GetPendingCountAsync(),
                    OnLeaveToday = onLeaveToday
                }
            });
        }

        [HttpGet("attendance")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> AttendanceByDepartment([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
        {
            var deptSummary = await _unitOfWork.AttendanceLogs.GetDepartmentAttendanceSummaryAsync(from, to);

            var result = deptSummary.Values
                .Select(d => new AttendanceByDeptDto
                {
                    DepartmentId = d.DepartmentId,
                    Department = d.DepartmentName,
                    Total = d.Total,
                    Present = d.Present,
                    Absent = d.Absent,
                    Late = d.Late,
                    Pct = (int)Math.Round(d.AttendanceRate)
                })
                .OrderByDescending(d => d.Pct)
                .ToList();

            return Ok(new { success = true, data = result });
        }

        [HttpGet("leaves")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> LeavesByType([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
        {
            var allLeaves = await _unitOfWork.LeaveRequests.GetAllAsync();

            var lr = allLeaves.AsQueryable();
            if (from.HasValue) lr = lr.Where(l => l.FromDate >= from.Value);
            if (to.HasValue) lr = lr.Where(l => l.FromDate <= to.Value);

            var result = lr
                .GroupBy(l => new { l.LeaveTypeId, TypeName = l.LeaveType != null ? l.LeaveType.Name : string.Empty })
                .Select(g => new LeaveByTypeDto
                {
                    LeaveTypeId = g.Key.LeaveTypeId ?? string.Empty,
                    LeaveType = g.Key.TypeName,
                    Total = g.Count(),
                    Approved = g.Count(l => l.Status == LeaveStatus.Approved),
                    Pending = g.Count(l => l.Status == LeaveStatus.Pending),
                    Rejected = g.Count(l => l.Status == LeaveStatus.Rejected)
                })
                .ToList();

            return Ok(new { success = true, data = result });
        }

        [HttpGet("export")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> Export(
            [FromQuery] string type = "attendance",
            [FromQuery] DateOnly? from = null,
            [FromQuery] DateOnly? to = null,
            [FromQuery] string? departmentId = null)
        {
            var sb = new StringBuilder();
            sb.Append('\uFEFF');

            if (type.Equals("leaves", StringComparison.OrdinalIgnoreCase))
            {
                var allLeaves = await _unitOfWork.LeaveRequests.GetAllAsync();
                var lr = allLeaves.AsQueryable();

                if (from.HasValue) lr = lr.Where(l => l.FromDate >= from.Value);
                if (to.HasValue) lr = lr.Where(l => l.FromDate <= to.Value);
                if (!string.IsNullOrEmpty(departmentId))
                    lr = lr.Where(l => l.Employee != null && l.Employee.DepartmentId == departmentId);

                var rows = lr.OrderByDescending(l => l.FromDate).ToList();
                sb.AppendLine("Employee,LeaveType,From,To,Days,Status");
                foreach (var l in rows)
                {
                    var employeeName = l.Employee != null ? l.Employee.Name : "";
                    var leaveTypeName = l.LeaveType != null ? l.LeaveType.Name : "";

                    sb.AppendLine(string.Join(",",
                        Csv(employeeName),
                        Csv(leaveTypeName),
                        l.FromDate.ToString(),
                        l.ToDate.ToString(),
                        l.DaysCount.ToString(),
                        l.Status.ToString()));
                }

                return CsvFile(sb, "leaves");
            }
            else
            {
                var rows = await _unitOfWork.AttendanceLogs.GetByDateRangeWithFiltersAsync(from, to, departmentId);

                sb.AppendLine("Employee,Department,Date,CheckIn,CheckOut,Status");
                foreach (var a in rows)
                {
                    var employeeName = a.Employee != null ? a.Employee.Name : "";
                    var departmentName = (a.Employee != null && a.Employee.Department != null) ? a.Employee.Department.Name : "";
                    var checkIn = a.CheckIn != null ? a.CheckIn.Value.ToString() : "-";
                    var checkOut = a.CheckOut != null ? a.CheckOut.Value.ToString() : "-";

                    sb.AppendLine(string.Join(",",
                        Csv(employeeName),
                        Csv(departmentName),
                        a.Date.ToString(),
                        checkIn,
                        checkOut,
                        a.Status.ToString()));
                }

                return CsvFile(sb, "attendance");
            }
        }

        private static string Csv(string? value)
        {
            value ??= "";
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
                return "\"" + value.Replace("\"", "\"\"") + "\"";
            return value;
        }

        private FileContentResult CsvFile(StringBuilder sb, string name)
        {
            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return File(bytes, "text/csv", $"{name}_{DateTime.Today:yyyy-MM-dd}.csv");
        }
    }
}