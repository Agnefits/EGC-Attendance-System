using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Services;
using Attendance_System.Data;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LeaveController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;

        public LeaveController(AppDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet("requests")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> GetLeaveRequests(
            [FromQuery] LeaveStatus? status,
            [FromQuery] string? departmentId,
            [FromQuery] string? employeeId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.LeaveRequests
                .Include(l => l.Employee).ThenInclude(e => e!.Department)
                .Include(l => l.LeaveType)
                .Include(l => l.Manager)
                .AsQueryable();

            if (status.HasValue) query = query.Where(l => l.Status == status.Value);
            if (!string.IsNullOrEmpty(departmentId)) query = query.Where(l => l.Employee!.DepartmentId == departmentId);
            if (!string.IsNullOrEmpty(employeeId)) query = query.Where(l => l.EmployeeId == employeeId);

            var total = await query.CountAsync();

            var requests = await query
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new
                {
                    l.Id,
                    l.EmployeeId,
                    EmployeeName = l.Employee!.Name,
                    Department = l.Employee.Department != null ? l.Employee.Department.Name : null,
                    LeaveType = l.LeaveType!.Name,
                    l.FromDate,
                    l.ToDate,
                    l.DaysCount,
                    l.Reason,
                    l.Status,
                    l.CreatedAt,
                    Manager = l.Manager != null ? l.Manager.Name : null,
                    l.RejectionNote,
                    l.GrantedByAdmin,
                    l.MaternityMode
                })
                .ToListAsync();

            return Ok(new { success = true, data = requests, pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) } });
        }

        [HttpGet("requests/my")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetMyLeaveRequests()
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId)) return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var requests = await _context.LeaveRequests
                .Include(l => l.LeaveType)
                .Where(l => l.EmployeeId == employeeId)
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new
                {
                    l.Id,
                    LeaveType = l.LeaveType!.Name,
                    l.FromDate,
                    l.ToDate,
                    l.DaysCount,
                    l.Reason,
                    l.Status,
                    l.CreatedAt,
                    l.RejectionNote
                })
                .ToListAsync();

            return Ok(new { success = true, data = requests });
        }

        [HttpPost("requests")]
        [AuthorizedRoles]
        public async Task<IActionResult> CreateLeaveRequest([FromBody] CreateLeaveRequestDto dto)
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId)) return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
            if (employee == null) return BadRequest(new { success = false, message = "Employee not found" });

            var leaveType = await _context.LeaveTypes.FirstOrDefaultAsync(lt => lt.Id == dto.LeaveTypeId);
            if (leaveType == null) return BadRequest(new { success = false, message = "Invalid leave type" });

            var today = DateOnly.FromDateTime(DateTime.Today);

            // ?? Basic date checks ??
            if (dto.ToDate < dto.FromDate)
                return BadRequest(new { success = false, message = "End date is before start date" });

            // ?? Women-only types (e.g. maternity) ??
            if (leaveType.WomenOnly && employee.Gender != Gender.Female)
                return BadRequest(new { success = false, message = "This leave type is available for female employees only" });

            // ?? Grant: cannot be self-submitted ??
            if (dto.LeaveTypeId == "grant")
                return BadRequest(new { success = false, message = "Grant leave can only be issued by management" });

            // ?? Urgent leave: current week only, not in the past ??
            if (dto.LeaveTypeId == "urgent")
            {
                var (weekStart, weekEnd) = WeekRange(today);
                if (dto.FromDate < weekStart || dto.FromDate > weekEnd)
                    return BadRequest(new { success = false, message = "Urgent leave must be within the current week" });
                if (dto.FromDate < today)
                    return BadRequest(new { success = false, message = "Cannot request urgent leave for past days" });
            }

            // ?? Compensatory leave: 1 day, same week, worked Saturday, none already this week ??
            if (dto.LeaveTypeId == "compensatory")
            {
                if (dto.FromDate != dto.ToDate)
                    return BadRequest(new { success = false, message = "Compensatory leave is 1 day only" });

                var (weekStart, weekEnd) = WeekRange(dto.FromDate);
                if (dto.FromDate < weekStart || dto.FromDate > weekEnd)
                    return BadRequest(new { success = false, message = "Compensatory leave must be in the same week as the worked day" });

                var workedSaturday = await _context.AttendanceLogs.AnyAsync(a =>
                    a.EmployeeId == employeeId &&
                    a.Date >= weekStart && a.Date <= weekEnd &&
                    a.Date.DayOfWeek == DayOfWeek.Saturday &&
                    (a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late || a.Status == AttendanceStatus.Left));
                if (!workedSaturday)
                    return BadRequest(new { success = false, message = "No Saturday attendance record found for this week" });

                var hasCompensatory = await _context.LeaveRequests.AnyAsync(l =>
                    l.EmployeeId == employeeId &&
                    l.LeaveTypeId == "compensatory" &&
                    l.Status != LeaveStatus.Rejected &&
                    l.FromDate >= weekStart && l.FromDate <= weekEnd);
                if (hasCompensatory)
                    return BadRequest(new { success = false, message = "You already have a compensatory leave this week" });
            }

            // ?? Friday rule (all types): cannot start or end on Friday ??
            if (dto.FromDate.DayOfWeek == DayOfWeek.Friday)
                return BadRequest(new { success = false, message = "Leave cannot start on Friday" });
            if (dto.ToDate.DayOfWeek == DayOfWeek.Friday)
                return BadRequest(new { success = false, message = "Leave cannot end on Friday" });

            // ?? Server computes the day count (Fridays excluded) — never trust the client value ??
            var daysCount = CountWorkDays(dto.FromDate, dto.ToDate);
            if (daysCount <= 0)
                return BadRequest(new { success = false, message = "Leave must include at least one working day" });

            // ?? Balance check (skip types with no cap, e.g. unpaid) ??
            if (leaveType.MaxAnnualDays > 0)
            {
                var (lyStart, lyEnd) = LeaveYearPeriod(today);
                var used = await _context.LeaveRequests
                    .Where(l => l.EmployeeId == employeeId && l.LeaveTypeId == dto.LeaveTypeId
                                && l.Status == LeaveStatus.Approved && l.FromDate >= lyStart && l.FromDate <= lyEnd)
                    .SumAsync(l => (int?)l.DaysCount) ?? 0;

                if (used + daysCount > leaveType.MaxAnnualDays)
                    return BadRequest(new
                    {
                        success = false,
                        message = $"Insufficient balance. Remaining: {Math.Max(0, leaveType.MaxAnnualDays - used)} day(s), requested: {daysCount}"
                    });
            }

            var request = new LeaveRequest
            {
                Id = Guid.NewGuid().ToString(),
                EmployeeId = employeeId,
                LeaveTypeId = dto.LeaveTypeId,
                FromDate = dto.FromDate,
                ToDate = dto.ToDate,
                DaysCount = daysCount,
                Reason = dto.Reason,
                MaternityMode = dto.MaternityMode,
                Status = LeaveStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.LeaveRequests.Add(request);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Leave request submitted successfully", data = new { request.Id, request.DaysCount, request.Status } });
        }

        [HttpPut("requests/{id}/approve")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> ApproveLeaveRequest(string id, [FromBody] ApproveLeaveDto dto)
        {
            var request = await _context.LeaveRequests
                .Include(l => l.Employee)
                .Include(l => l.LeaveType)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (request == null) return NotFound(new { success = false, message = "Request not found" });
            if (request.Status != LeaveStatus.Pending) return BadRequest(new { success = false, message = "Request already processed" });

            var approverId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(approverId)) return Unauthorized(new { success = false, message = "No employee linked to this account" });

            // Head can only act on requests from their own department.
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role == "Head")
            {
                var headDeptId = await _context.Employees.Where(e => e.Id == approverId).Select(e => e.DepartmentId).FirstOrDefaultAsync();
                if (request.Employee!.DepartmentId != headDeptId)
                    return StatusCode(403, new { success = false, message = "You can only review requests from your own department" });
            }

            request.Status = dto.Approved ? LeaveStatus.Approved : LeaveStatus.Rejected;
            request.ManagerId = approverId;
            request.RejectionNote = dto.Approved ? null : dto.RejectionNote;
            request.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Fire-and-forget notification e-mail.
            if (!string.IsNullOrEmpty(request.Employee?.Email))
            {
                var decision = dto.Approved ? "approved" : "rejected";
                _ = Task.Run(() => _emailService.SendEmailAsync(
                    request.Employee!.Email,
                    $"Leave request {decision}",
                    $"<p>Your leave request ({request.LeaveType?.Name}) from {request.FromDate} to {request.ToDate} was {decision}.</p>"));
            }

            return Ok(new { success = true, message = dto.Approved ? "Request approved" : "Request rejected", data = new { request.Id, request.Status } });
        }

        // ?? helpers ??

        private string? GetCurrentEmployeeId() => User.FindFirst("EmployeeId")?.Value;

        // Working days between two dates, excluding Fridays.
        private static int CountWorkDays(DateOnly from, DateOnly to)
        {
            int count = 0;
            for (var d = from; d <= to; d = d.AddDays(1))
                if (d.DayOfWeek != DayOfWeek.Friday) count++;
            return count;
        }

        // Week range Sunday..Saturday containing the given date.
        private static (DateOnly start, DateOnly end) WeekRange(DateOnly date)
        {
            int dow = (int)date.DayOfWeek; // Sunday = 0
            return (date.AddDays(-dow), date.AddDays(6 - dow));
        }

        // Leave year: Jul 1 ? Jun 30
        private static (DateOnly start, DateOnly end) LeaveYearPeriod(DateOnly today)
        {
            int y = today.Month >= 7 ? today.Year : today.Year - 1;
            return (new DateOnly(y, 7, 1), new DateOnly(y + 1, 6, 30));
        }
    }

    public class CreateLeaveRequestDto
    {
        public string LeaveTypeId { get; set; } = string.Empty;
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public MaternityMode? MaternityMode { get; set; }
        // DaysCount removed — the server computes it (Fridays excluded).
    }

    public class ApproveLeaveDto
    {
        public bool Approved { get; set; }
        public string? RejectionNote { get; set; }
    }
}