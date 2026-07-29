using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Data;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AttendanceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AttendanceController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> GetAll(
            [FromQuery] DateOnly? from,
            [FromQuery] DateOnly? to,
            [FromQuery] string? employeeId,
            [FromQuery] string? departmentId,
            [FromQuery] AttendanceStatus? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var query = _context.AttendanceLogs
                    .Include(a => a.Employee)
                    .ThenInclude(e => e!.Department)
                    .Include(a => a.Employee)
                    .ThenInclude(e => e!.College)
                    .AsQueryable();

                if (from.HasValue) query = query.Where(a => a.Date >= from.Value);
                if (to.HasValue) query = query.Where(a => a.Date <= to.Value);
                if (!string.IsNullOrEmpty(employeeId)) query = query.Where(a => a.EmployeeId == employeeId);
                if (!string.IsNullOrEmpty(departmentId)) query = query.Where(a => a.Employee!.DepartmentId == departmentId);
                if (status.HasValue) query = query.Where(a => a.Status == status.Value);

                var total = await query.CountAsync();

                var attendances = await query
                    .OrderByDescending(a => a.Date)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(a => new
                    {
                        a.Id,
                        a.EmployeeId,
                        EmployeeName = a.Employee!.Name,
                        Department = a.Employee.Department != null ? a.Employee.Department.Name : null,
                        College = a.Employee.College != null ? a.Employee.College.Name : null,
                        a.Date,
                        a.CheckIn,
                        a.CheckOut,
                        a.Status,
                        a.Latitude,
                        a.Longitude,
                        a.DistanceFromCampus,
                        a.ResolutionMethod
                    })
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = attendances,
                    pagination = new
                    {
                        page,
                        pageSize,
                        total,
                        totalPages = (int)Math.Ceiling((double)total / pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("employee/{employeeId}")]
        public async Task<IActionResult> GetByEmployee(string employeeId)
        {
            try
            {
                var attendances = await _context.AttendanceLogs
                    .Where(a => a.EmployeeId == employeeId)
                    .OrderByDescending(a => a.Date)
                    .ToListAsync();

                return Ok(new { success = true, data = attendances });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("today")]
        public async Task<IActionResult> GetTodayAttendance()
        {
            try
            {
                var today = DateOnly.FromDateTime(DateTime.Today);
                var totalEmployees = await _context.Employees.CountAsync(e => e.Status == "active");

                var attendances = await _context.AttendanceLogs
                    .Include(a => a.Employee)
                    .ThenInclude(e => e!.Department)
                    .Where(a => a.Date == today)
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        Date = today,
                        TotalEmployees = totalEmployees,
                        CheckedIn = attendances.Count(a => a.CheckIn != null),
                        CheckedOut = attendances.Count(a => a.CheckOut != null),
                        Details = attendances
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPost("checkin")]
        public async Task<IActionResult> CheckIn([FromBody] CheckInDto dto)
        {
            try
            {
                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == dto.EmployeeId);
                if (employee == null || employee.Status != "active")
                    return BadRequest(new { success = false, message = "Employee not found or inactive" });

                var today = DateOnly.FromDateTime(DateTime.Today);
                var existing = await _context.AttendanceLogs.FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == today);
                if (existing != null)
                    return BadRequest(new { success = false, message = "Already checked in today" });

                var now = TimeOnly.FromDateTime(DateTime.Now);
                var schedule = await GetWorkSchedule(dto.EmployeeId);

                var status = AttendanceStatus.Present;
                if (schedule?.CheckInTime != null && now > schedule.CheckInTime.Value.AddMinutes(15))
                {
                    status = AttendanceStatus.Late;
                }

                var attendance = new AttendanceLog
                {
                    Id = Guid.NewGuid().ToString(),
                    EmployeeId = dto.EmployeeId,
                    Date = today,
                    CheckIn = now,
                    Status = status,
                    Latitude = dto.Latitude,
                    Longitude = dto.Longitude,
                    GpsAccuracy = dto.GpsAccuracy,
                    ResolutionMethod = dto.ResolutionMethod,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.AttendanceLogs.Add(attendance);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Check-in successful",
                    data = new
                    {
                        attendance.Id,
                        attendance.CheckIn,
                        attendance.Status
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("checkout/{id}")]
        public async Task<IActionResult> CheckOut(string id)
        {
            try
            {
                var attendance = await _context.AttendanceLogs.Include(a => a.Employee).FirstOrDefaultAsync(a => a.Id == id);
                if (attendance == null || attendance.CheckOut != null)
                    return BadRequest(new { success = false, message = "Record not found or already checked out" });

                attendance.CheckOut = TimeOnly.FromDateTime(DateTime.Now);
                attendance.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(new
                {
                    success = true,
                    message = "Check-out successful",
                    data = new
                    {
                        attendance.Id,
                        attendance.CheckOut
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        private async Task<WorkSchedule?> GetWorkSchedule(string employeeId)
        {
            var assignment = await _context.ScheduleAssignments
                .Include(sa => sa.Schedule)
                .FirstOrDefaultAsync(sa => sa.EmployeeId == employeeId);

            if (assignment?.Schedule != null) return assignment.Schedule;

            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee?.DepartmentId == null) return null;

            var deptAssignment = await _context.ScheduleAssignments
                .Include(sa => sa.Schedule)
                .FirstOrDefaultAsync(sa => sa.DepartmentId == employee.DepartmentId);

            return deptAssignment?.Schedule;
        }
    }

    public class CheckInDto
    {
        public string EmployeeId { get; set; } = string.Empty;
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? GpsAccuracy { get; set; }
        public ResolutionMethod? ResolutionMethod { get; set; }
    }
}
