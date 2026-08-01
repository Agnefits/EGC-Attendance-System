using Attendance_System.DTOs.Attendance;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Models;
using Attendance_System.UnitOfWork;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Globalization;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AttendanceController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private const double DefaultCampusLat = 27.184187;
        private const double DefaultCampusLng = 31.172920;
        private const double DefaultCampusRadius = 500;
        private const double MaxAccuracyMargin = 200;

        public AttendanceController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
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
            var total = await _unitOfWork.AttendanceLogs.GetFilteredCountAsync(from, to, employeeId, departmentId, status);

            var attendances = await _unitOfWork.AttendanceLogs.GetFilteredAsync(
                from, to, employeeId, departmentId, status, page, pageSize);

            var result = attendances.Select(a => new AttendanceListDto
            {
                Id = a.Id,
                EmployeeId = a.EmployeeId,
                EmployeeName = a.Employee?.Name ?? string.Empty,
                Department = a.Employee?.Department?.Name,
                College = a.Employee?.College?.Name,
                Date = a.Date,
                CheckIn = a.CheckIn,
                CheckOut = a.CheckOut,
                Status = a.Status,
                Latitude = a.Latitude,
                Longitude = a.Longitude,
                DistanceFromCampus = a.DistanceFromCampus,
                ResolutionMethod = a.ResolutionMethod
            });

            return Ok(new
            {
                success = true,
                data = result,
                pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) }
            });
        }

        [HttpGet("my")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetMy()
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var attendances = await _unitOfWork.AttendanceLogs.GetByEmployeeIdWithDetailsAsync(employeeId);

            var result = attendances.Select(a => new AttendanceDto
            {
                Id = a.Id,
                EmployeeId = a.EmployeeId,
                EmployeeName = a.Employee?.Name ?? string.Empty,
                Date = a.Date,
                CheckIn = a.CheckIn,
                CheckOut = a.CheckOut,
                Status = a.Status,
                Latitude = a.Latitude,
                Longitude = a.Longitude,
                DistanceFromCampus = a.DistanceFromCampus,
                ResolutionMethod = a.ResolutionMethod
            });

            return Ok(new { success = true, data = result });
        }

        [HttpGet("employee/{employeeId}")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> GetByEmployee(string employeeId)
        {
            var attendances = await _unitOfWork.AttendanceLogs.GetByEmployeeIdWithDetailsAsync(employeeId);

            var result = attendances.Select(a => new AttendanceDto
            {
                Id = a.Id,
                EmployeeId = a.EmployeeId,
                EmployeeName = a.Employee?.Name ?? string.Empty,
                Date = a.Date,
                CheckIn = a.CheckIn,
                CheckOut = a.CheckOut,
                Status = a.Status,
                Latitude = a.Latitude,
                Longitude = a.Longitude,
                DistanceFromCampus = a.DistanceFromCampus,
                ResolutionMethod = a.ResolutionMethod
            });

            return Ok(new { success = true, data = result });
        }

        [HttpGet("today")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> GetTodayAttendance()
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var totalEmployees = await _unitOfWork.Employees.GetActiveEmployeesCountAsync();

            var attendances = await _unitOfWork.AttendanceLogs.GetByDateRangeWithDetailsAsync(today, today);

            var result = attendances.Select(a => new AttendanceDto
            {
                Id = a.Id,
                EmployeeId = a.EmployeeId,
                EmployeeName = a.Employee?.Name ?? string.Empty,
                Department = a.Employee?.Department?.Name,
                Date = a.Date,
                CheckIn = a.CheckIn,
                CheckOut = a.CheckOut,
                Status = a.Status,
                Latitude = a.Latitude,
                Longitude = a.Longitude,
                DistanceFromCampus = a.DistanceFromCampus,
                ResolutionMethod = a.ResolutionMethod
            }).ToList();

            return Ok(new
            {
                success = true,
                data = new AttendanceSummaryDto
                {
                    Date = today,
                    TotalEmployees = totalEmployees,
                    CheckedIn = result.Count(a => a.CheckIn != null),
                    CheckedOut = result.Count(a => a.CheckOut != null),
                    Details = result
                }
            });
        }

        [HttpPost("checkin")]
        [AuthorizedRoles]
        public async Task<IActionResult> CheckIn([FromBody] CheckInDto dto)
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var employee = await _unitOfWork.Employees.GetEmployeeWithDepartmentAndCollegeAsync(employeeId);
            if (employee == null || employee.Status != "active")
                return BadRequest(new { success = false, message = "Employee not found or inactive" });

            if (dto.Latitude == null || dto.Longitude == null)
                return BadRequest(new { success = false, message = "Location (latitude/longitude) is required" });

            var (campusLat, campusLng, radius) = await GetCampusGeofenceAsync();
            var distance = Haversine((double)dto.Latitude.Value, (double)dto.Longitude.Value, campusLat, campusLng);

            var margin = Math.Min((double)(dto.GpsAccuracy ?? 0), MaxAccuracyMargin);
            var allowedRadius = radius + margin;

            if (distance > allowedRadius)
                return StatusCode(422, new
                {
                    success = false,
                    message = "Outside campus range",
                    distance = Math.Round(distance),
                    allowed = radius
                });

            var today = DateOnly.FromDateTime(DateTime.Today);
            var existing = await _unitOfWork.AttendanceLogs.GetByEmployeeAndDateAsync(employeeId, today);
            if (existing != null)
                return BadRequest(new { success = false, message = "Already checked in today" });

            var now = TimeOnly.FromDateTime(DateTime.Now);
            var schedule = await GetWorkSchedule(employeeId);

            var status = AttendanceStatus.Present;
            if (schedule?.CheckInTime != null && now > schedule.CheckInTime.Value.AddMinutes(15))
                status = AttendanceStatus.Late;

            var attendance = new AttendanceLog
            {
                Id = Guid.NewGuid().ToString(),
                EmployeeId = employeeId,
                Date = today,
                CheckIn = now,
                Status = status,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                GpsAccuracy = dto.GpsAccuracy,
                DistanceFromCampus = (decimal)Math.Round(distance, 2),
                ResolutionMethod = dto.ResolutionMethod,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _unitOfWork.AttendanceLogs.AddAsync(attendance);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Check-in successful",
                data = new { attendance.Id, attendance.CheckIn, attendance.Status, attendance.DistanceFromCampus }
            });
        }

        [HttpPut("checkout/{id}")]
        [AuthorizedRoles]
        public async Task<IActionResult> CheckOut(string id)
        {
            var employeeId = GetCurrentEmployeeId();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            var attendance = await _unitOfWork.AttendanceLogs.GetByIdWithEmployeeAsync(id);
            if (attendance == null || attendance.CheckOut != null)
                return BadRequest(new { success = false, message = "Record not found or already checked out" });

            var isManager = role == "Admin" || role == "Hr";
            if (!isManager && attendance.EmployeeId != employeeId)
                return StatusCode(403, new { success = false, message = "You can only check out your own attendance record" });

            attendance.CheckOut = TimeOnly.FromDateTime(DateTime.Now);
            attendance.Status = AttendanceStatus.Left;
            attendance.UpdatedAt = DateTime.UtcNow;

            _unitOfWork.AttendanceLogs.Update(attendance);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Check-out successful",
                data = new { attendance.Id, attendance.CheckOut, attendance.Status }
            });
        }

        // ── Helpers ──

        private string? GetCurrentEmployeeId() => User.FindFirst("EmployeeId")?.Value;

        private async Task<(double lat, double lng, double radius)> GetCampusGeofenceAsync()
        {
            var settings = await _unitOfWork.SystemSettings.Query()
                .Where(s => s.Key == "campus.lat" || s.Key == "campus.lng" || s.Key == "campus.radius")
                .ToDictionaryAsync(s => s.Key, s => s.Value);

            double lat = Parse(settings, "campus.lat", DefaultCampusLat);
            double lng = Parse(settings, "campus.lng", DefaultCampusLng);
            double radius = Parse(settings, "campus.radius", DefaultCampusRadius);
            return (lat, lng, radius);
        }

        private static double Parse(Dictionary<string, string> map, string key, double fallback)
            => map.TryGetValue(key, out var v) && double.TryParse(v, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : fallback;

        private static double Haversine(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000;
            double dLat = (lat2 - lat1) * Math.PI / 180;
            double dLon = (lon2 - lon1) * Math.PI / 180;
            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                       Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        private async Task<WorkSchedule?> GetWorkSchedule(string employeeId)
        {
            var assignment = await _unitOfWork.ScheduleAssignments.GetByEmployeeIdWithScheduleAsync(employeeId);
            if (assignment?.Schedule != null) return assignment.Schedule;

            var departmentId = await _unitOfWork.Employees.GetDepartmentIdByEmployeeIdAsync(employeeId);
            if (departmentId == null) return null;

            var deptAssignment = await _unitOfWork.ScheduleAssignments.GetByDepartmentIdWithScheduleAsync(departmentId);
            return deptAssignment?.Schedule;
        }
    }
}