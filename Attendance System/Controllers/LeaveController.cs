using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Services;
using Attendance_System.UnitOfWork;
using Attendance_System.DTOs.Leave;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LeaveController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IEmailService _emailService;

        public LeaveController(IUnitOfWork unitOfWork, IEmailService emailService)
        {
            _unitOfWork = unitOfWork;
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
            IEnumerable<LeaveRequest> requests;

            if (departmentId != null)
            {
                requests = await _unitOfWork.LeaveRequests.GetPendingByDepartmentWithDetailsAsync(departmentId);
            }
            else if (employeeId != null)
            {
                var empRequests = await _unitOfWork.LeaveRequests.GetByEmployeeIdWithDetailsAsync(employeeId);
                requests = empRequests;
            }
            else
            {
                // Admin/HR get all
                var allRequests = await _unitOfWork.LeaveRequests.GetAllAsync();
                requests = allRequests
                    .Where(l => l.Employee != null && l.Employee.DeletedAt == null)
                    .Select(l => new LeaveRequest
                    {
                        Id = l.Id,
                        EmployeeId = l.EmployeeId,
                        Employee = l.Employee,
                        LeaveTypeId = l.LeaveTypeId,
                        LeaveType = l.LeaveType,
                        FromDate = l.FromDate,
                        ToDate = l.ToDate,
                        DaysCount = l.DaysCount,
                        Reason = l.Reason,
                        Status = l.Status,
                        RejectionNote = l.RejectionNote,
                        ManagerId = l.ManagerId,
                        Manager = l.Manager,
                        GrantedByAdmin = l.GrantedByAdmin,
                        MaternityMode = l.MaternityMode,
                        CreatedAt = l.CreatedAt,
                        UpdatedAt = l.UpdatedAt
                    });
            }

            if (status.HasValue)
                requests = requests.Where(l => l.Status == status.Value);

            var total = requests.Count();

            var result = requests
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new LeaveRequestDto
                {
                    Id = l.Id,
                    EmployeeId = l.EmployeeId,
                    EmployeeName = l.Employee?.Name ?? string.Empty,
                    Department = l.Employee?.Department?.Name,
                    LeaveType = l.LeaveType?.Name ?? string.Empty,
                    FromDate = l.FromDate,
                    ToDate = l.ToDate,
                    DaysCount = l.DaysCount,
                    Reason = l.Reason,
                    Status = l.Status,
                    CreatedAt = l.CreatedAt,
                    Manager = l.Manager?.Name,
                    RejectionNote = l.RejectionNote,
                    GrantedByAdmin = l.GrantedByAdmin,
                    MaternityMode = l.MaternityMode
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

        [HttpGet("requests/my")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetMyLeaveRequests()
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var requests = await _unitOfWork.LeaveRequests.GetByEmployeeIdWithDetailsAsync(employeeId);

            var result = requests.Select(l => new MyLeaveRequestDto
            {
                Id = l.Id,
                LeaveType = l.LeaveType?.Name ?? string.Empty,
                FromDate = l.FromDate,
                ToDate = l.ToDate,
                DaysCount = l.DaysCount,
                Reason = l.Reason,
                Status = l.Status,
                CreatedAt = l.CreatedAt,
                RejectionNote = l.RejectionNote
            });

            return Ok(new { success = true, data = result });
        }

        [HttpPost("requests")]
        [AuthorizedRoles]
        public async Task<IActionResult> CreateLeaveRequest([FromBody] CreateLeaveRequestDto dto)
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var employee = await _unitOfWork.Employees.GetEmployeeWithDepartmentAndCollegeAsync(employeeId);
            if (employee == null)
                return BadRequest(new { success = false, message = "Employee not found" });

            var leaveType = await _unitOfWork.LeaveTypes.GetByIdAsync(dto.LeaveTypeId);
            if (leaveType == null)
                return BadRequest(new { success = false, message = "Invalid leave type" });

            var today = DateOnly.FromDateTime(DateTime.Today);

            if (dto.ToDate < dto.FromDate)
                return BadRequest(new { success = false, message = "End date is before start date" });

            if (leaveType.WomenOnly && employee.Gender != Gender.Female)
                return BadRequest(new { success = false, message = "This leave type is available for female employees only" });

            if (dto.LeaveTypeId == "grant")
                return BadRequest(new { success = false, message = "Grant leave can only be issued by management" });

            // Urgent leave validation
            if (dto.LeaveTypeId == "urgent")
            {
                var (weekStart, weekEnd) = WeekRange(today);
                if (dto.FromDate < weekStart || dto.FromDate > weekEnd)
                    return BadRequest(new { success = false, message = "Urgent leave must be within the current week" });
                if (dto.FromDate < today)
                    return BadRequest(new { success = false, message = "Cannot request urgent leave for past days" });
            }

            // Compensatory leave validation
            if (dto.LeaveTypeId == "compensatory")
            {
                if (dto.FromDate != dto.ToDate)
                    return BadRequest(new { success = false, message = "Compensatory leave is 1 day only" });

                var (weekStart, weekEnd) = WeekRange(dto.FromDate);
                if (dto.FromDate < weekStart || dto.FromDate > weekEnd)
                    return BadRequest(new { success = false, message = "Compensatory leave must be in the same week as the worked day" });

                var attendances = await _unitOfWork.AttendanceLogs.GetByEmployeeIdAsync(employeeId);
                var workedSaturday = attendances.Any(a =>
                    a.Date >= weekStart && a.Date <= weekEnd &&
                    a.Date.DayOfWeek == DayOfWeek.Saturday &&
                    (a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late || a.Status == AttendanceStatus.Left));
                if (!workedSaturday)
                    return BadRequest(new { success = false, message = "No Saturday attendance record found for this week" });

                var leaveRequests = await _unitOfWork.LeaveRequests.GetByEmployeeIdAsync(employeeId);
                var hasCompensatory = leaveRequests.Any(l =>
                    l.LeaveTypeId == "compensatory" &&
                    l.Status != LeaveStatus.Rejected &&
                    l.FromDate >= weekStart && l.FromDate <= weekEnd);
                if (hasCompensatory)
                    return BadRequest(new { success = false, message = "You already have a compensatory leave this week" });
            }

            // Friday rule
            if (dto.FromDate.DayOfWeek == DayOfWeek.Friday)
                return BadRequest(new { success = false, message = "Leave cannot start on Friday" });
            if (dto.ToDate.DayOfWeek == DayOfWeek.Friday)
                return BadRequest(new { success = false, message = "Leave cannot end on Friday" });

            var daysCount = CountWorkDays(dto.FromDate, dto.ToDate);
            if (daysCount <= 0)
                return BadRequest(new { success = false, message = "Leave must include at least one working day" });

            // Balance check
            if (leaveType.MaxAnnualDays > 0)
            {
                var (lyStart, lyEnd) = LeaveYearPeriod(today);
                var used = await _unitOfWork.LeaveRequests.GetApprovedLeaveDaysByEmployeeAndTypeAsync(
                    employeeId, dto.LeaveTypeId, lyStart, lyEnd);

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

            await _unitOfWork.LeaveRequests.AddAsync(request);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Leave request submitted successfully",
                data = new { request.Id, request.DaysCount, request.Status }
            });
        }

        [HttpPut("requests/{id}/approve")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> ApproveLeaveRequest(string id, [FromBody] ApproveLeaveDto dto)
        {
            var request = await _unitOfWork.LeaveRequests.GetLeaveRequestWithDetailsAsync(id);

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
            request.ManagerId = approverId;
            request.RejectionNote = dto.Approved ? null : dto.RejectionNote;
            request.UpdatedAt = DateTime.UtcNow;

            _unitOfWork.LeaveRequests.Update(request);
            await _unitOfWork.CompleteAsync();

            if (!string.IsNullOrEmpty(request.Employee?.Email))
            {
                var decision = dto.Approved ? "approved" : "rejected";
                _ = Task.Run(() => _emailService.SendEmailAsync(
                    request.Employee!.Email,
                    $"Leave request {decision}",
                    $"<p>Your leave request ({request.LeaveType?.Name}) from {request.FromDate} to {request.ToDate} was {decision}.</p>"));
            }

            return Ok(new
            {
                success = true,
                message = dto.Approved ? "Request approved" : "Request rejected",
                data = new { request.Id, request.Status }
            });
        }

        // ── Helpers ──

        private string? GetCurrentEmployeeId() => User.FindFirst("EmployeeId")?.Value;

        private static int CountWorkDays(DateOnly from, DateOnly to)
        {
            int count = 0;
            for (var d = from; d <= to; d = d.AddDays(1))
                if (d.DayOfWeek != DayOfWeek.Friday) count++;
            return count;
        }

        private static (DateOnly start, DateOnly end) WeekRange(DateOnly date)
        {
            int dow = (int)date.DayOfWeek;
            return (date.AddDays(-dow), date.AddDays(6 - dow));
        }

        private static (DateOnly start, DateOnly end) LeaveYearPeriod(DateOnly today)
        {
            int y = today.Month >= 7 ? today.Year : today.Year - 1;
            return (new DateOnly(y, 7, 1), new DateOnly(y + 1, 6, 30));
        }
    }
}