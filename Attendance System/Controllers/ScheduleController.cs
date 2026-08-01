using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.DTOs.Schedule;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScheduleController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public ScheduleController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet("work")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetWorkSchedules()
        {
            var schedules = await _unitOfWork.WorkSchedules.Query()
                .Select(ws => new WorkScheduleDto
                {
                    Id = ws.Id,
                    Title = ws.Title,
                    TimeMode = ws.TimeMode,
                    CheckInTime = ws.CheckInTime,
                    CheckOutTime = ws.CheckOutTime,
                    HoursPerDay = ws.HoursPerDay,
                    DaysPerWeek = ws.DaysPerWeek,
                    TargetScope = ws.TargetScope
                })
                .ToListAsync();

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

            await _unitOfWork.WorkSchedules.AddAsync(schedule);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Work schedule added successfully",
                data = new
                {
                    schedule.Id,
                    schedule.Title,
                    schedule.TimeMode,
                    schedule.CheckInTime,
                    schedule.CheckOutTime
                }
            });
        }

        [HttpPost("assign")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> AssignSchedule([FromBody] AssignScheduleDto dto)
        {
            var schedule = await _unitOfWork.WorkSchedules.GetByIdAsync(dto.ScheduleId);
            if (schedule == null)
                return BadRequest(new { success = false, message = "Schedule not found" });

            if (string.IsNullOrEmpty(dto.EmployeeId) && string.IsNullOrEmpty(dto.DepartmentId))
                return BadRequest(new { success = false, message = "Either EmployeeId or DepartmentId must be provided" });

            var assignment = new ScheduleAssignment
            {
                ScheduleId = dto.ScheduleId,
                EmployeeId = dto.EmployeeId,
                DepartmentId = dto.DepartmentId
            };

            await _unitOfWork.ScheduleAssignments.AddAsync(assignment);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Schedule assigned successfully",
                data = new { assignment.Id, assignment.ScheduleId, assignment.EmployeeId, assignment.DepartmentId }
            });
        }

        [HttpGet("employee/{employeeId}")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetEmployeeSchedule(string employeeId)
        {
            var assignment = await _unitOfWork.ScheduleAssignments.Query()
                .Include(sa => sa.Schedule)
                .FirstOrDefaultAsync(sa => sa.EmployeeId == employeeId);

            if (assignment?.Schedule == null)
            {
                var employee = await _unitOfWork.Employees.Query()
                    .FirstOrDefaultAsync(e => e.Id == employeeId && e.DeletedAt == null);
                if (employee?.DepartmentId != null)
                {
                    assignment = await _unitOfWork.ScheduleAssignments.Query()
                        .Include(sa => sa.Schedule)
                        .FirstOrDefaultAsync(sa => sa.DepartmentId == employee.DepartmentId);
                }
            }

            if (assignment?.Schedule == null)
                return Ok(new { success = true, data = new { Message = "No schedule assigned" } });

            return Ok(new
            {
                success = true,
                data = new EmployeeScheduleDto
                {
                    ScheduleId = assignment.ScheduleId,
                    Title = assignment.Schedule.Title,
                    TimeMode = assignment.Schedule.TimeMode,
                    CheckInTime = assignment.Schedule.CheckInTime,
                    CheckOutTime = assignment.Schedule.CheckOutTime,
                    HoursPerDay = assignment.Schedule.HoursPerDay,
                    DaysPerWeek = assignment.Schedule.DaysPerWeek
                }
            });
        }
    }
}