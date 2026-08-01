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

        // NOTE: Colleges and Departments endpoints were moved out of this controller
        // into CollegesController and DepartmentsController. This controller now
        // only handles work schedules and their assignments.

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
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
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