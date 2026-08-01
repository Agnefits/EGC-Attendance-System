using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.DTOs.Permissions;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PermissionsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private const int MonthlyBudgetMinutes = 240;

        public PermissionsController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> GetAll(
            [FromQuery] LeaveStatus? status,
            [FromQuery] string? departmentId,
            [FromQuery] string? employeeId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            IEnumerable<PermissionRequest> requests;

            if (departmentId != null)
            {
                requests = await _unitOfWork.PermissionRequests.GetPendingByDepartmentWithDetailsAsync(departmentId);
            }
            else if (employeeId != null)
            {
                requests = await _unitOfWork.PermissionRequests.GetByEmployeeIdWithDetailsAsync(employeeId);
            }
            else
            {
                var allRequests = await _unitOfWork.PermissionRequests.GetAllAsync();
                requests = allRequests
                    .Where(p => p.Employee != null && p.Employee.DeletedAt == null);
            }

            if (status.HasValue)
                requests = requests.Where(p => p.Status == status.Value);

            var total = requests.Count();

            var result = requests
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PermissionRequestDto
                {
                    Id = p.Id,
                    EmployeeId = p.EmployeeId,
                    EmployeeName = p.Employee?.Name ?? string.Empty,
                    Department = p.Employee?.Department?.Name,
                    PermissionType = p.PermissionType,
                    Date = p.Date ?? DateOnly.FromDateTime(DateTime.Today),
                    DurationMinutes = p.DurationMinutes,
                    Reason = p.Reason,
                    Status = p.Status,
                    RejectionNote = p.RejectionNote,
                    Approver = p.Approver?.Name,
                    CreatedAt = p.CreatedAt
                })
                .ToList();

            return Ok(new
            {
                success = true,
                data = result,
                pagination = new
                {
                    page,
                    pageSize,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / pageSize)
                }
            });
        }

        [HttpGet("my")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetMy()
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var requests = await _unitOfWork.PermissionRequests.GetByEmployeeIdWithDetailsAsync(employeeId);

            var result = requests.Select(p => new MyPermissionRequestDto
            {
                Id = p.Id,
                PermissionType = p.PermissionType,
                Date = p.Date ?? DateOnly.FromDateTime(DateTime.Today),
                DurationMinutes = p.DurationMinutes,
                Reason = p.Reason,
                Status = p.Status,
                RejectionNote = p.RejectionNote,
                CreatedAt = p.CreatedAt
            });

            var today = DateOnly.FromDateTime(DateTime.Today);
            var (mStart, mEnd) = MonthPeriod(today);
            var used = await _unitOfWork.PermissionRequests.GetUsedMinutesByEmployeeAndDateRangeExcludingNursingAsync(employeeId, mStart, mEnd);

            return Ok(new
            {
                success = true,
                data = result,
                budget = new PermissionBudgetDto
                {
                    Monthly = MonthlyBudgetMinutes,
                    Used = used,
                    Remaining = Math.Max(0, MonthlyBudgetMinutes - used)
                }
            });
        }

        [HttpPost("request")]
        [AuthorizedRoles]
        public async Task<IActionResult> Create([FromBody] CreatePermissionRequestDto dto)
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var employee = await _unitOfWork.Employees.GetEmployeeWithDepartmentAndCollegeAsync(employeeId);
            if (employee == null)
                return BadRequest(new { success = false, message = "Employee not found" });

            if (dto.DurationMinutes <= 0)
                return BadRequest(new { success = false, message = "Duration must be greater than zero" });

            var date = dto.Date ?? DateOnly.FromDateTime(DateTime.Today);

            if (dto.PermissionType == PermissionType.Nursing && employee.Gender != Gender.Female)
                return BadRequest(new { success = false, message = "Nursing permission is available for female employees only" });

            if (dto.PermissionType != PermissionType.Nursing)
            {
                var (mStart, mEnd) = MonthPeriod(date);
                var used = await _unitOfWork.PermissionRequests.GetUsedMinutesByEmployeeAndDateRangeExcludingNursingAsync(employeeId, mStart, mEnd);

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

            await _unitOfWork.PermissionRequests.AddAsync(request);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Permission request submitted successfully",
                data = new { request.Id, request.Status }
            });
        }

        [HttpPut("{id}/approve")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> Approve(string id, [FromBody] ApprovePermissionDto dto)
        {
            var request = await _unitOfWork.PermissionRequests.GetPermissionRequestWithDetailsAsync(id);

            if (request == null)
                return NotFound(new { success = false, message = "Request not found" });
            if (request.Status != LeaveStatus.Pending)
                return BadRequest(new { success = false, message = "Request already processed" });

            var approverId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(approverId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role == "Head")
            {
                var headDeptId = await _unitOfWork.Employees.GetDepartmentIdByEmployeeIdAsync(approverId);
                if (request.Employee?.DepartmentId != headDeptId)
                    return StatusCode(403, new { success = false, message = "You can only review requests from your own department" });
            }

            request.Status = dto.Approved ? LeaveStatus.Approved : LeaveStatus.Rejected;
            request.ApprovedBy = approverId;
            request.RejectionNote = dto.Approved ? null : dto.RejectionNote;
            request.UpdatedAt = DateTime.UtcNow;

            _unitOfWork.PermissionRequests.Update(request);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = dto.Approved ? "Request approved" : "Request rejected",
                data = new { request.Id, request.Status }
            });
        }

        private string? GetCurrentEmployeeId() => User.FindFirst("EmployeeId")?.Value;

        private static (DateOnly start, DateOnly end) MonthPeriod(DateOnly date)
        {
            var start = new DateOnly(date.Year, date.Month, 1);
            var end = new DateOnly(date.Year, date.Month, DateTime.DaysInMonth(date.Year, date.Month));
            return (start, end);
        }
    }
}