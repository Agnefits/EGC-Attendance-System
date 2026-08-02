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

        // ?? Personal weekly sessions (each employee manages their own) ??

        [HttpGet("sessions/my")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetMySessions()
        {
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var sessions = await _unitOfWork.ScheduleSessions.GetByEmployeeIdAsync(employeeId);
            return Ok(new { success = true, data = sessions.Select(MapSession) });
        }

        [HttpPost("sessions")]
        [AuthorizedRoles]
        public async Task<IActionResult> CreateSession([FromBody] CreateScheduleSessionDto dto)
        {
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            if (string.IsNullOrWhiteSpace(dto.Subject))
                return BadRequest(new { success = false, message = "Subject is required" });
            if (dto.DayOfWeek < 0 || dto.DayOfWeek > 6)
                return BadRequest(new { success = false, message = "DayOfWeek must be between 0 (Sunday) and 6 (Saturday)" });
            if (!TimeOnly.TryParse(dto.StartTime, out var start) || !TimeOnly.TryParse(dto.EndTime, out var end))
                return BadRequest(new { success = false, message = "Invalid start or end time" });
            if (end <= start)
                return BadRequest(new { success = false, message = "End time must be after start time" });

            var session = new ScheduleSession
            {
                EmployeeId = employeeId,   // always the caller — never trust a client-supplied id
                Subject = dto.Subject.Trim(),
                DayOfWeek = dto.DayOfWeek,
                StartTime = start,
                EndTime = end,
                GroupName = string.IsNullOrWhiteSpace(dto.GroupName) ? null : dto.GroupName.Trim(),
                Room = string.IsNullOrWhiteSpace(dto.Room) ? null : dto.Room.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _unitOfWork.ScheduleSessions.AddAsync(session);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Session added successfully", data = MapSession(session) });
        }

        [HttpDelete("sessions/{id}")]
        [AuthorizedRoles]
        public async Task<IActionResult> DeleteSession(long id)
        {
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var session = await _unitOfWork.ScheduleSessions.GetByIdAsync(id);
            if (session == null)
                return NotFound(new { success = false, message = "Session not found" });
            if (session.EmployeeId != employeeId)
                return StatusCode(403, new { success = false, message = "You can only delete your own sessions" });

            _unitOfWork.ScheduleSessions.Delete(session);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Session deleted successfully" });
        }

        private static ScheduleSessionDto MapSession(ScheduleSession s) => new ScheduleSessionDto
        {
            Id = s.Id,
            Subject = s.Subject,
            DayOfWeek = s.DayOfWeek,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            GroupName = s.GroupName,
            Room = s.Room
        };

        // ?? Personal exams (each employee manages their own) ??

        [HttpGet("exams/my")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetMyExams()
        {
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var exams = await _unitOfWork.ExamSchedules.GetByEmployeeIdAsync(employeeId);
            return Ok(new { success = true, data = exams.OrderBy(e => e.Date).Select(MapExam) });
        }

        [HttpPost("exams")]
        [AuthorizedRoles]
        public async Task<IActionResult> CreateExam([FromBody] CreateExamScheduleDto dto)
        {
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(new { success = false, message = "Title is required" });
            if (!DateOnly.TryParse(dto.Date, out var date))
                return BadRequest(new { success = false, message = "Invalid date" });

            var exam = new ExamSchedule
            {
                EmployeeId = employeeId,   // always the caller
                Title = dto.Title.Trim(),
                Date = date,
                TimeSlot = string.IsNullOrWhiteSpace(dto.TimeSlot) ? null : dto.TimeSlot.Trim(),
                RoomLocation = string.IsNullOrWhiteSpace(dto.RoomLocation) ? null : dto.RoomLocation.Trim(),
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.ExamSchedules.AddAsync(exam);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Exam added successfully", data = MapExam(exam) });
        }

        [HttpDelete("exams/{id}")]
        [AuthorizedRoles]
        public async Task<IActionResult> DeleteExam(long id)
        {
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var exam = await _unitOfWork.ExamSchedules.GetByIdAsync(id);
            if (exam == null)
                return NotFound(new { success = false, message = "Exam not found" });
            if (exam.EmployeeId != employeeId)
                return StatusCode(403, new { success = false, message = "You can only delete your own exams" });

            _unitOfWork.ExamSchedules.Delete(exam);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Exam deleted successfully" });
        }

        private static ExamScheduleDto MapExam(ExamSchedule e) => new ExamScheduleDto
        {
            Id = e.Id,
            Title = e.Title,
            Date = e.Date,
            TimeSlot = e.TimeSlot,
            RoomLocation = e.RoomLocation,
            Notes = e.Notes
        };

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