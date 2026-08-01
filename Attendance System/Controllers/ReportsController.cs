using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Data;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public ReportsController(AppDbContext context) { _context = context; }

        // GET /api/reports/summary?from=&to=&departmentId=
        // High-level KPIs. "present" counts Present + Left (matches the front-end definition).
        [HttpGet("summary")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> Summary(
            [FromQuery] DateOnly? from,
            [FromQuery] DateOnly? to,
            [FromQuery] string? departmentId)
        {
            var att = _context.AttendanceLogs.Include(a => a.Employee).AsQueryable();
            if (from.HasValue) att = att.Where(a => a.Date >= from.Value);
            if (to.HasValue) att = att.Where(a => a.Date <= to.Value);
            if (!string.IsNullOrEmpty(departmentId)) att = att.Where(a => a.Employee!.DepartmentId == departmentId);

            var total = await att.CountAsync();
            var present = await att.CountAsync(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left);
            var absent = await att.CountAsync(a => a.Status == AttendanceStatus.Absent);
            var late = await att.CountAsync(a => a.Status == AttendanceStatus.Late);

            var today = DateOnly.FromDateTime(DateTime.Today);
            var todayAtt = _context.AttendanceLogs.Where(a => a.Date == today);
            if (!string.IsNullOrEmpty(departmentId))
                todayAtt = todayAtt.Where(a => a.Employee!.DepartmentId == departmentId);

            var empQuery = _context.Employees.Where(e => e.DeletedAt == null && e.Status == "active");
            if (!string.IsNullOrEmpty(departmentId)) empQuery = empQuery.Where(e => e.DepartmentId == departmentId);

            var onLeaveToday = await _context.LeaveRequests
                .CountAsync(l => l.Status == LeaveStatus.Approved && l.FromDate <= today && l.ToDate >= today);

            return Ok(new
            {
                success = true,
                data = new
                {
                    TotalEmployees = await empQuery.CountAsync(),
                    Range = new { From = from, To = to },
                    Present = present,
                    Absent = absent,
                    Late = late,
                    AttendanceRate = total > 0 ? (int)Math.Round((double)present / total * 100) : 0,
                    Today = new
                    {
                        Present = await todayAtt.CountAsync(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left),
                        Absent = await todayAtt.CountAsync(a => a.Status == AttendanceStatus.Absent),
                        Late = await todayAtt.CountAsync(a => a.Status == AttendanceStatus.Late)
                    },
                    PendingLeaves = await _context.LeaveRequests.CountAsync(l => l.Status == LeaveStatus.Pending),
                    PendingPermissions = await _context.PermissionRequests.CountAsync(p => p.Status == LeaveStatus.Pending),
                    OnLeaveToday = onLeaveToday
                }
            });
        }

        // GET /api/reports/attendance?from=&to=  — breakdown per department
        [HttpGet("attendance")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> AttendanceByDepartment([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
        {
            var logs = _context.AttendanceLogs.Include(a => a.Employee).ThenInclude(e => e!.Department).AsQueryable();
            if (from.HasValue) logs = logs.Where(a => a.Date >= from.Value);
            if (to.HasValue) logs = logs.Where(a => a.Date <= to.Value);

            var grouped = await logs
                .Where(a => a.Employee != null && a.Employee.DepartmentId != null)
                .GroupBy(a => new { a.Employee!.DepartmentId, DeptName = a.Employee.Department!.Name })
                .Select(g => new
                {
                    DepartmentId = g.Key.DepartmentId,
                    Department = g.Key.DeptName,
                    Total = g.Count(),
                    Present = g.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left),
                    Absent = g.Count(a => a.Status == AttendanceStatus.Absent),
                    Late = g.Count(a => a.Status == AttendanceStatus.Late)
                })
                .ToListAsync();

            var result = grouped
                .Select(g => new
                {
                    g.DepartmentId,
                    g.Department,
                    g.Total,
                    g.Present,
                    g.Absent,
                    g.Late,
                    Pct = g.Total > 0 ? (int)Math.Round((double)g.Present / g.Total * 100) : 0
                })
                .OrderByDescending(g => g.Pct)
                .ToList();

            return Ok(new { success = true, data = result });
        }

        // GET /api/reports/leaves  — breakdown per leave type
        [HttpGet("leaves")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> LeavesByType([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
        {
            var lr = _context.LeaveRequests.Include(l => l.LeaveType).AsQueryable();
            if (from.HasValue) lr = lr.Where(l => l.FromDate >= from.Value);
            if (to.HasValue) lr = lr.Where(l => l.FromDate <= to.Value);

            var result = await lr
                .GroupBy(l => new { l.LeaveTypeId, TypeName = l.LeaveType!.Name })
                .Select(g => new
                {
                    LeaveTypeId = g.Key.LeaveTypeId,
                    LeaveType = g.Key.TypeName,
                    Total = g.Count(),
                    Approved = g.Count(l => l.Status == LeaveStatus.Approved),
                    Pending = g.Count(l => l.Status == LeaveStatus.Pending),
                    Rejected = g.Count(l => l.Status == LeaveStatus.Rejected)
                })
                .ToListAsync();

            return Ok(new { success = true, data = result });
        }

        // GET /api/reports/export?type=attendance|leaves&from=&to=&departmentId=
        // Returns a UTF-8 CSV (BOM included) so Excel opens Arabic correctly.
        // For native .xlsx add the ClosedXML package and branch here.
        [HttpGet("export")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> Export(
            [FromQuery] string type = "attendance",
            [FromQuery] DateOnly? from = null,
            [FromQuery] DateOnly? to = null,
            [FromQuery] string? departmentId = null)
        {
            var sb = new StringBuilder();
            sb.Append('\uFEFF'); // BOM for Excel/Arabic

            if (type.Equals("leaves", StringComparison.OrdinalIgnoreCase))
            {
                var lr = _context.LeaveRequests.Include(l => l.Employee).Include(l => l.LeaveType).AsQueryable();
                if (from.HasValue) lr = lr.Where(l => l.FromDate >= from.Value);
                if (to.HasValue) lr = lr.Where(l => l.FromDate <= to.Value);
                if (!string.IsNullOrEmpty(departmentId)) lr = lr.Where(l => l.Employee!.DepartmentId == departmentId);

                var rows = await lr.OrderByDescending(l => l.FromDate).ToListAsync();
                sb.AppendLine("Employee,LeaveType,From,To,Days,Status");
                foreach (var l in rows)
                    sb.AppendLine(string.Join(",",
                        Csv(l.Employee?.Name), Csv(l.LeaveType?.Name),
                        l.FromDate, l.ToDate, l.DaysCount, l.Status));

                return CsvFile(sb, "leaves");
            }
            else
            {
                var logs = _context.AttendanceLogs.Include(a => a.Employee).ThenInclude(e => e!.Department).AsQueryable();
                if (from.HasValue) logs = logs.Where(a => a.Date >= from.Value);
                if (to.HasValue) logs = logs.Where(a => a.Date <= to.Value);
                if (!string.IsNullOrEmpty(departmentId)) logs = logs.Where(a => a.Employee!.DepartmentId == departmentId);

                var rows = await logs.OrderByDescending(a => a.Date).ToListAsync();
                sb.AppendLine("Employee,Department,Date,CheckIn,CheckOut,Status");
                foreach (var a in rows)
                    sb.AppendLine(string.Join(",",
                        Csv(a.Employee?.Name), Csv(a.Employee?.Department?.Name),
                        a.Date, a.CheckIn?.ToString() ?? "-", a.CheckOut?.ToString() ?? "-", a.Status));

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