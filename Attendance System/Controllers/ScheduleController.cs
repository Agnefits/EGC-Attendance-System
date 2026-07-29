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
    public class ScheduleController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ScheduleController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("colleges")]
        public async Task<IActionResult> GetColleges()
        {
            var colleges = await _context.Colleges
                .Select(c => new { c.Id, c.Name, c.NameEn, c.Code, c.CreatedAt })
                .ToListAsync();
            return Ok(new { success = true, data = colleges });
        }

        [HttpPost("colleges")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> CreateCollege([FromBody] CreateCollegeDto dto)
        {
            var exists = await _context.Colleges.AnyAsync(c => c.Code == dto.Code);
            if (exists) return BadRequest(new { success = false, message = "Code already exists" });

            var college = new College
            {
                Id = Guid.NewGuid().ToString(),
                Name = dto.Name,
                NameEn = dto.NameEn,
                Code = dto.Code,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            _context.Colleges.Add(college);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "College added successfully", data = college });
        }

        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments([FromQuery] string? collegeId)
        {
            var query = _context.Departments.Include(d => d.College).AsQueryable();
            if (!string.IsNullOrEmpty(collegeId)) query = query.Where(d => d.CollegeId == collegeId);

            var departments = await query.Select(d => new
            {
                d.Id,
                d.Name,
                d.NameEn,
                d.Code,
                d.DeptType,
                CollegeName = d.College != null ? d.College.Name : null,
                d.ParentId,
                d.CreatedAt
            }).ToListAsync();

            return Ok(new { success = true, data = departments });
        }

        [HttpPost("departments")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> CreateDepartment([FromBody] CreateDepartmentDto dto)
        {
            var exists = await _context.Departments.AnyAsync(d => d.Code == dto.Code);
            if (exists) return BadRequest(new { success = false, message = "Code already exists" });

            var department = new Department
            {
                Id = Guid.NewGuid().ToString(),
                Name = dto.Name,
                NameEn = dto.NameEn,
                Code = dto.Code,
                DeptType = dto.DeptType,
                CollegeId = dto.CollegeId,
                ParentId = dto.ParentId,
                ParentType = dto.ParentType,
                FunctionDescription = dto.FunctionDescription,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            _context.Departments.Add(department);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Department added successfully", data = department });
        }

        [HttpGet("work")]
        public async Task<IActionResult> GetWorkSchedules()
        {
            var schedules = await _context.WorkSchedules.Select(ws => new
            {
                ws.Id,
                ws.Title,
                ws.TimeMode,
                ws.CheckInTime,
                ws.CheckOutTime,
                ws.HoursPerDay,
                ws.DaysPerWeek,
                ws.TargetScope
            }).ToListAsync();

            return Ok(new { success = true, data = schedules });
        }

        [HttpPost("work")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> CreateWorkSchedule([FromBody] CreateWorkScheduleDto dto)
        {
            var schedule = new WorkSchedule
            {
                Title = dto.Title,
                TimeMode = dto.TimeMode,
                CheckInTime = dto.CheckInTime,
                CheckOutTime = dto.CheckOutTime,
                HoursPerDay = dto.HoursPerDay,
                DaysPerWeek = dto.DaysPerWeek,
                TargetScope = dto.TargetScope,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.WorkSchedules.Add(schedule);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Work schedule added successfully", data = schedule });
        }

        [HttpPost("assign")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> AssignSchedule([FromBody] AssignScheduleDto dto)
        {
            var assignment = new ScheduleAssignment
            {
                ScheduleId = dto.ScheduleId,
                EmployeeId = dto.EmployeeId,
                DepartmentId = dto.DepartmentId
            };

            _context.ScheduleAssignments.Add(assignment);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Schedule assigned successfully", data = assignment });
        }

        [HttpGet("employee/{employeeId}")]
        public async Task<IActionResult> GetEmployeeSchedule(string employeeId)
        {
            var assignment = await _context.ScheduleAssignments
                .Include(sa => sa.Schedule)
                .FirstOrDefaultAsync(sa => sa.EmployeeId == employeeId);

            if (assignment?.Schedule == null)
            {
                var employee = await _context.Employees.FindAsync(employeeId);
                if (employee?.DepartmentId != null)
                {
                    assignment = await _context.ScheduleAssignments
                        .Include(sa => sa.Schedule)
                        .FirstOrDefaultAsync(sa => sa.DepartmentId == employee.DepartmentId);
                }
            }

            if (assignment?.Schedule == null)
                return Ok(new { success = true, data = new { Message = "No schedule assigned" } });

            return Ok(new
            {
                success = true,
                data = new
                {
                    assignment.ScheduleId,
                    assignment.Schedule.Title,
                    assignment.Schedule.TimeMode,
                    assignment.Schedule.CheckInTime,
                    assignment.Schedule.CheckOutTime,
                    assignment.Schedule.HoursPerDay,
                    assignment.Schedule.DaysPerWeek
                }
            });
        }
    }

    public class CreateCollegeDto { public string Name { get; set; } = string.Empty; public string NameEn { get; set; } = string.Empty; public string Code { get; set; } = string.Empty; }
    public class CreateDepartmentDto
    {
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DepartmentType DeptType { get; set; }
        public string? CollegeId { get; set; }
        public string? ParentId { get; set; }
        public string? ParentType { get; set; }
        public string? FunctionDescription { get; set; }
    }
    public class CreateWorkScheduleDto
    {
        public string Title { get; set; } = string.Empty;
        public ScheduleTimeMode TimeMode { get; set; }
        public TimeOnly? CheckInTime { get; set; }
        public TimeOnly? CheckOutTime { get; set; }
        public decimal HoursPerDay { get; set; } = 8.00m;
        public int DaysPerWeek { get; set; } = 5;
        public TargetScope TargetScope { get; set; }
    }
    public class AssignScheduleDto
    {
        public long ScheduleId { get; set; }
        public string? EmployeeId { get; set; }
        public string? DepartmentId { get; set; }
    }
}
