using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
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
            try
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
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("requests/my")]
        public async Task<IActionResult> GetMyLeaveRequests()
        {
            try
            {
                var employeeId = GetCurrentEmployeeId();
                if (employeeId == null) return Unauthorized();

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
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("requests")]
        public async Task<IActionResult> CreateLeaveRequest([FromBody] CreateLeaveRequestDto dto)
        {
            try
            {
                var employeeId = GetCurrentEmployeeId();
                if (employeeId == null) return Unauthorized();

                var request = new LeaveRequest
                {
                    Id = Guid.NewGuid().ToString(),
                    EmployeeId = employeeId,
                    LeaveTypeId = dto.LeaveTypeId,
                    FromDate = dto.FromDate,
                    ToDate = dto.ToDate,
                    DaysCount = dto.DaysCount,
                    Reason = dto.Reason,
                    MaternityMode = dto.MaternityMode,
                    Status = LeaveStatus.Pending,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };

                _context.LeaveRequests.Add(request);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Leave request submitted successfully", data = request });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("requests/{id}/approve")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> ApproveLeaveRequest(string id, [FromBody] ApproveLeaveDto dto)
        {
            try
            {
                var request = await _context.LeaveRequests
                    .Include(l => l.Employee)
                    .Include(l => l.LeaveType)
                    .FirstOrDefaultAsync(l => l.Id == id);

                if (request == null) return NotFound(new { success = false, message = "Request not found" });
                if (request.Status != LeaveStatus.Pending) return BadRequest(new { success = false, message = "Request already processed" });

                var approverId = GetCurrentEmployeeId();
                if (approverId == null) return Unauthorized();

                request.Status = dto.Approved ? LeaveStatus.Approved : LeaveStatus.Rejected;
                request.ManagerId = approverId;
                request.RejectionNote = dto.RejectionNote;
                request.UpdatedAt = DateTime.Now;

                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = dto.Approved ? "Request approved" : "Request rejected", data = request });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        private string? GetCurrentEmployeeId()
        {
            return User.FindFirst("EmployeeId")?.Value;
        }
    }

    public class CreateLeaveRequestDto
    {
        public string LeaveTypeId { get; set; } = string.Empty;
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public int DaysCount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public MaternityMode? MaternityMode { get; set; }
    }

    public class ApproveLeaveDto
    {
        public bool Approved { get; set; }
        public string? RejectionNote { get; set; }
    }
}
