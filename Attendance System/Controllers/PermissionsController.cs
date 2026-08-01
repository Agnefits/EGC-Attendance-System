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
    public class PermissionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        // Monthly permission budget in minutes (matches the front-end MONTHLY_PERMS = 240).
        private const int MonthlyBudgetMinutes = 240;

        public PermissionsController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/permissions  — management view
        [HttpGet]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> GetAll(
            [FromQuery] LeaveStatus? status,
            [FromQuery] string? departmentId,
            [FromQuery] string? employeeId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.PermissionRequests
                .Include(p => p.Employee).ThenInclude(e => e!.Department)
                .Include(p => p.Approver)
                .AsQueryable();

            if (status.HasValue) query = query.Where(p => p.Status == status.Value);
            if (!string.IsNullOrEmpty(departmentId)) query = query.Where(p => p.Employee!.DepartmentId == departmentId);
            if (!string.IsNullOrEmpty(employeeId)) query = query.Where(p => p.EmployeeId == employeeId);

            var total = await query.CountAsync();

            var requests = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id,
                    p.EmployeeId,
                    EmployeeName = p.Employee!.Name,
                    Department = p.Employee.Department != null ? p.Employee.Department.Name : null,
                    p.PermissionType,
                    p.Date,
                    p.DurationMinutes,
                    p.Reason,
                    p.Status,
                    p.RejectionNote,
                    Approver = p.Approver != null ? p.Approver.Name : null,
                    p.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = requests, pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) } });
        }

        // GET /api/permissions/my  — caller's own
        [HttpGet("my")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetMy()
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId)) return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var requests = await _context.PermissionRequests
                .Where(p => p.EmployeeId == employeeId)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.PermissionType,
                    p.Date,
                    p.DurationMinutes,
                    p.Reason,
                    p.Status,
                    p.RejectionNote,
                    p.CreatedAt
                })
                .ToListAsync();

            // Also surface the remaining monthly budget for the current month.
            var (mStart, mEnd) = MonthPeriod(DateOnly.FromDateTime(DateTime.Today));
            var used = await _context.PermissionRequests
                .Where(p => p.EmployeeId == employeeId && p.PermissionType != PermissionType.Nursing
                            && p.Status != LeaveStatus.Rejected && p.Date >= mStart && p.Date <= mEnd)
                .SumAsync(p => (int?)p.DurationMinutes) ?? 0;

            return Ok(new
            {
                success = true,
                data = requests,
                budget = new { monthly = MonthlyBudgetMinutes, used, remaining = Math.Max(0, MonthlyBudgetMinutes - used) }
            });
        }

        // POST /api/permissions/request
        [HttpPost("request")]
        [AuthorizedRoles]
        public async Task<IActionResult> Create([FromBody] CreatePermissionRequestDto dto)
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId)) return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == employeeId);
            if (employee == null) return BadRequest(new { success = false, message = "Employee not found" });

            if (dto.DurationMinutes <= 0)
                return BadRequest(new { success = false, message = "Duration must be greater than zero" });

            var date = dto.Date ?? DateOnly.FromDateTime(DateTime.Today);

            // ── Nursing rule: female employees only ──
            if (dto.PermissionType == PermissionType.Nursing && employee.Gender != Gender.Female)
                return BadRequest(new { success = false, message = "Nursing permission is available for female employees only" });

            // ── Monthly 240-minute budget (nursing is a separate entitlement, exempt from the cap) ──
            if (dto.PermissionType != PermissionType.Nursing)
            {
                var (mStart, mEnd) = MonthPeriod(date);
                var used = await _context.PermissionRequests
                    .Where(p => p.EmployeeId == employeeId && p.PermissionType != PermissionType.Nursing
                                && p.Status != LeaveStatus.Rejected && p.Date >= mStart && p.Date <= mEnd)
                    .SumAsync(p => (int?)p.DurationMinutes) ?? 0;

                if (used + dto.DurationMinutes > MonthlyBudgetMinutes)
                    return BadRequest(new
                    {
                        success = false,
                        message = $"Monthly permission budget exceeded. Remaining: {Math.Max(0, MonthlyBudgetMinutes - used)} min, requested: {dto.DurationMinutes} min"
                    });
            }

            var request = new PermissionRequest
            {
                Id = Guid.NewGuid().ToString(),
                EmployeeId = employeeId,
                PermissionType = dto.PermissionType,
                Date = date,
                DurationMinutes = dto.DurationMinutes,
                Reason = dto.Reason,
                Status = LeaveStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.PermissionRequests.Add(request);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Permission request submitted successfully", data = new { request.Id, request.Status } });
        }

        // PUT /api/permissions/{id}/approve
        [HttpPut("{id}/approve")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> Approve(string id, [FromBody] ApprovePermissionDto dto)
        {
            var request = await _context.PermissionRequests
                .Include(p => p.Employee)
                .FirstOrDefaultAsync(p => p.Id == id);

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
            request.ApprovedBy = approverId;
            request.RejectionNote = dto.Approved ? null : dto.RejectionNote;
            request.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = dto.Approved ? "Request approved" : "Request rejected", data = new { request.Id, request.Status } });
        }

        // ── helpers ──

        private string? GetCurrentEmployeeId() => User.FindFirst("EmployeeId")?.Value;

        private static (DateOnly start, DateOnly end) MonthPeriod(DateOnly date)
        {
            var start = new DateOnly(date.Year, date.Month, 1);
            var end = new DateOnly(date.Year, date.Month, DateTime.DaysInMonth(date.Year, date.Month));
            return (start, end);
        }
    }

    public class CreatePermissionRequestDto
    {
        public PermissionType PermissionType { get; set; }
        public DateOnly? Date { get; set; }
        public int DurationMinutes { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class ApprovePermissionDto
    {
        public bool Approved { get; set; }
        public string? RejectionNote { get; set; }
    }
}