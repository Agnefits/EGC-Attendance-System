using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
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
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        public DashboardController(AppDbContext context) { _context = context; }

        // GET /api/dashboard  — dispatches by the caller's role (from the token).
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

        // Admin / HR: global figures + per-department breakdown + consecutive-absence alerts.
        private async Task<object> BuildManagementAsync()
        {
            var today = DateOnly.FromDateTime(DateTime.Today);

            var total = await _context.AttendanceLogs.CountAsync();
            var present = await _context.AttendanceLogs.CountAsync(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left);
            var absent = await _context.AttendanceLogs.CountAsync(a => a.Status == AttendanceStatus.Absent);
            var late = await _context.AttendanceLogs.CountAsync(a => a.Status == AttendanceStatus.Late);

            var todayLogs = _context.AttendanceLogs.Where(a => a.Date == today);

            var byDept = await _context.AttendanceLogs
                .Include(a => a.Employee).ThenInclude(e => e!.Department)
                .Where(a => a.Employee != null && a.Employee.DepartmentId != null)
                .GroupBy(a => new { a.Employee!.DepartmentId, Name = a.Employee.Department!.Name })
                .Select(g => new
                {
                    g.Key.DepartmentId,
                    Department = g.Key.Name,
                    Present = g.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left),
                    Absent = g.Count(a => a.Status == AttendanceStatus.Absent),
                    Late = g.Count(a => a.Status == AttendanceStatus.Late),
                    Total = g.Count()
                })
                .ToListAsync();

            var departments = byDept
                .Select(d => new { d.DepartmentId, d.Department, d.Present, d.Absent, d.Late, Pct = d.Total > 0 ? (int)Math.Round((double)d.Present / d.Total * 100) : 0 })
                .OrderByDescending(d => d.Pct)
                .ToList();

            return new
            {
                TotalEmployees = await _context.Employees.CountAsync(e => e.DeletedAt == null && e.Status == "active"),
                Overall = new
                {
                    Present = present,
                    Absent = absent,
                    Late = late,
                    Rate = total > 0 ? (int)Math.Round((double)present / total * 100) : 0
                },
                Today = new
                {
                    Present = await todayLogs.CountAsync(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left),
                    Absent = await todayLogs.CountAsync(a => a.Status == AttendanceStatus.Absent),
                    Late = await todayLogs.CountAsync(a => a.Status == AttendanceStatus.Late)
                },
                PendingLeaves = await _context.LeaveRequests.CountAsync(l => l.Status == LeaveStatus.Pending),
                PendingPermissions = await _context.PermissionRequests.CountAsync(p => p.Status == LeaveStatus.Pending),
                OnLeaveToday = await _context.LeaveRequests.CountAsync(l => l.Status == LeaveStatus.Approved && l.FromDate <= today && l.ToDate >= today),
                Departments = departments,
                ConsecutiveAbsences = await GetConsecutiveAbsencesAsync(today, null)
            };
        }

        // Head: same shape but scoped to the head's own department.
        private async Task<object> BuildHeadAsync(string? employeeId)
        {
            var deptId = await _context.Employees
                .Where(e => e.Id == employeeId)
                .Select(e => e.DepartmentId)
                .FirstOrDefaultAsync();

            var today = DateOnly.FromDateTime(DateTime.Today);
            var deptLogs = _context.AttendanceLogs.Where(a => a.Employee!.DepartmentId == deptId);

            var present = await deptLogs.CountAsync(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left);
            var absent = await deptLogs.CountAsync(a => a.Status == AttendanceStatus.Absent);
            var late = await deptLogs.CountAsync(a => a.Status == AttendanceStatus.Late);
            var total = await deptLogs.CountAsync();

            return new
            {
                DepartmentId = deptId,
                EmployeesCount = await _context.Employees.CountAsync(e => e.DepartmentId == deptId && e.DeletedAt == null && e.Status == "active"),
                Overall = new
                {
                    Present = present,
                    Absent = absent,
                    Late = late,
                    Rate = total > 0 ? (int)Math.Round((double)present / total * 100) : 0
                },
                PendingLeaves = await _context.LeaveRequests.CountAsync(l => l.Status == LeaveStatus.Pending && l.Employee!.DepartmentId == deptId),
                PendingPermissions = await _context.PermissionRequests.CountAsync(p => p.Status == LeaveStatus.Pending && p.Employee!.DepartmentId == deptId),
                ConsecutiveAbsences = await GetConsecutiveAbsencesAsync(today, deptId)
            };
        }

        // Employee: personal figures + monthly hours vs required + balances.
        private async Task<object> BuildEmployeeAsync(string? employeeId)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var monthStart = new DateOnly(today.Year, today.Month, 1);

            var myLogs = _context.AttendanceLogs.Where(a => a.EmployeeId == employeeId);

            var present = await myLogs.CountAsync(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left);
            var absent = await myLogs.CountAsync(a => a.Status == AttendanceStatus.Absent);
            var late = await myLogs.CountAsync(a => a.Status == AttendanceStatus.Late);

            var todayRecord = await myLogs
                .Where(a => a.Date == today)
                .Select(a => new { a.Status, a.CheckIn, a.CheckOut })
                .FirstOrDefaultAsync();

            var monthPresentDays = await myLogs.CountAsync(a =>
                a.Date >= monthStart && a.Date <= today &&
                (a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left || a.Status == AttendanceStatus.Late));

            return new
            {
                Attendance = new { Present = present, Absent = absent, Late = late },
                Today = todayRecord,
                MonthPresentDays = monthPresentDays,
                PendingLeaves = await _context.LeaveRequests.CountAsync(l => l.EmployeeId == employeeId && l.Status == LeaveStatus.Pending),
                ApprovedLeaves = await _context.LeaveRequests.CountAsync(l => l.EmployeeId == employeeId && l.Status == LeaveStatus.Approved),
                UsedPermissionMinutes = await _context.PermissionRequests
                    .Where(p => p.EmployeeId == employeeId && p.Status == LeaveStatus.Approved
                                && p.Date >= monthStart && p.Date <= today)
                    .SumAsync(p => (int?)p.DurationMinutes) ?? 0
            };
        }

        // Employees absent both yesterday and the day before (2+ consecutive), optionally dept-scoped.
        private async Task<object> GetConsecutiveAbsencesAsync(DateOnly today, string? departmentId)
        {
            var yesterday = today.AddDays(-1);
            var dayBefore = today.AddDays(-2);

            var q = _context.AttendanceLogs
                .Include(a => a.Employee)
                .Where(a => (a.Date == yesterday || a.Date == dayBefore) && a.Status == AttendanceStatus.Absent);

            if (!string.IsNullOrEmpty(departmentId))
                q = q.Where(a => a.Employee!.DepartmentId == departmentId);

            var offenders = await q
                .GroupBy(a => new { a.EmployeeId, Name = a.Employee!.Name })
                .Where(g => g.Count() >= 2)
                .Select(g => new { g.Key.EmployeeId, g.Key.Name })
                .ToListAsync();

            return new { Count = offenders.Count, Employees = offenders };
        }
    }
}