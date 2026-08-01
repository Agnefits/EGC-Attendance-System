using Microsoft.AspNetCore.Mvc;
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
            var schedules = await _unitOfWork.WorkSchedules.GetAllAsync();

            var result = schedules.Select(ws => new WorkScheduleDto
            {
                Id = ws.Id,
                Title = ws.Title,
                TimeMode = ws.TimeMode,
                CheckInTime = ws.CheckInTime,
                CheckOutTime = ws.CheckOutTime,
                HoursPerDay = ws.HoursPerDay,
                DaysPerWeek = ws.DaysPerWeek,
                TargetScope = ws.TargetScope
            });

            return Ok(new { success = true, data = result });
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

            // Check if assignment already exists
            if (!string.IsNullOrEmpty(dto.EmployeeId))
            {
                var exists = await _unitOfWork.ScheduleAssignments.AssignmentExistsForEmployeeAsync(dto.EmployeeId);
                if (exists)
                    return BadRequest(new { success = false, message = "Employee already has a schedule assignment" });
            }

            if (!string.IsNullOrEmpty(dto.DepartmentId))
            {
                var exists = await _unitOfWork.ScheduleAssignments.AssignmentExistsForDepartmentAsync(dto.DepartmentId);
                if (exists)
                    return BadRequest(new { success = false, message = "Department already has a schedule assignment" });
            }

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
            var assignment = await _unitOfWork.ScheduleAssignments.GetByEmployeeIdWithScheduleAsync(employeeId);

            if (assignment?.Schedule == null)
            {
                var departmentId = await _unitOfWork.Employees.GetDepartmentIdByEmployeeIdAsync(employeeId);
                if (departmentId != null)
                {
                    assignment = await _unitOfWork.ScheduleAssignments.GetByDepartmentIdWithScheduleAsync(departmentId);
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