using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;

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
        // No extra allowance for GPS/network inaccuracy — the campus radius is the hard limit.
        private const double MaxAccuracyMargin = 0;

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
            var query = _unitOfWork.AttendanceLogs.Query()
                .Include(a => a.Employee).ThenInclude(e => e!.Department)
                .Include(a => a.Employee).ThenInclude(e => e!.College)
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
                .Select(a => new AttendanceListItemDto
                {
                    Id = a.Id,
                    EmployeeId = a.EmployeeId,
                    EmployeeName = a.Employee!.Name,
                    Department = a.Employee.Department != null ? a.Employee.Department.Name : null,
                    College = a.Employee.College != null ? a.Employee.College.Name : null,
                    Date = a.Date,
                    CheckIn = a.CheckIn,
                    CheckOut = a.CheckOut,
                    Status = a.Status,
                    Latitude = a.Latitude,
                    Longitude = a.Longitude,
                    DistanceFromCampus = a.DistanceFromCampus,
                    ResolutionMethod = a.ResolutionMethod
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = attendances,
                pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) }
            });
        }

        [HttpGet("my")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetMy()
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId)) return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var attendances = await _unitOfWork.AttendanceLogs.GetByEmployeeIdAsync(employeeId);

            return Ok(new { success = true, data = attendances.OrderByDescending(a => a.Date) });
        }

        [HttpGet("employee/{employeeId}")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> GetByEmployee(string employeeId)
        {
            var attendances = await _unitOfWork.AttendanceLogs.GetByEmployeeIdAsync(employeeId);

            return Ok(new { success = true, data = attendances.OrderByDescending(a => a.Date) });
        }

        [HttpGet("today")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr, UserRole.Head)]
        public async Task<IActionResult> GetTodayAttendance()
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var totalEmployees = await _unitOfWork.Employees.Query().CountAsync(e => e.Status == "active" && e.DeletedAt == null);

            var attendances = await _unitOfWork.AttendanceLogs.Query()
                .Include(a => a.Employee).ThenInclude(e => e!.Department)
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

        [HttpPost("checkin")]
        [AuthorizedRoles]
        public async Task<IActionResult> CheckIn([FromBody] CheckInDto dto)
        {
            var employeeId = GetCurrentEmployeeId();
            if (string.IsNullOrEmpty(employeeId))
                return Unauthorized(new { success = false, message = "No employee linked to this account" });

            var employee = await _unitOfWork.Employees.GetByIdAsync(employeeId);
            if (employee == null || employee.Status != "active" || employee.DeletedAt != null)
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

            var resolutionMethod = ParseResolutionMethod(dto.ResolutionMethod);

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
                ResolutionMethod = resolutionMethod,
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

            var attendance = await _unitOfWork.AttendanceLogs.GetByIdAsync(id);
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

        // ── helpers ──

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
            var assignment = await _unitOfWork.ScheduleAssignments.Query()
                .Include(sa => sa.Schedule)
                .FirstOrDefaultAsync(sa => sa.EmployeeId == employeeId);

            if (assignment?.Schedule != null) return assignment.Schedule;

            var employee = await _unitOfWork.Employees.GetByIdAsync(employeeId);
            if (employee?.DepartmentId == null) return null;

            var deptAssignment = await _unitOfWork.ScheduleAssignments.Query()
                .Include(sa => sa.Schedule)
                .FirstOrDefaultAsync(sa => sa.DepartmentId == employee.DepartmentId);

            return deptAssignment?.Schedule;
        }

        // Accepts front-end values regardless of casing/separators: "gps-high", "gpsHigh",
        // "GpsHigh", "network", "Network"... instead of requiring an exact enum-name match.
        private static ResolutionMethod? ParseResolutionMethod(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;

            var normalized = value.Replace("-", "").Replace("_", "").Trim().ToLowerInvariant();
            return normalized switch
            {
                "gpshigh" => ResolutionMethod.GpsHigh,
                "network" => ResolutionMethod.Network,
                _ => null
            };
        }
    }

    // ── Response DTO ──

    public class AttendanceListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? College { get; set; }
        public DateOnly Date { get; set; }
        public TimeOnly? CheckIn { get; set; }
        public TimeOnly? CheckOut { get; set; }
        public AttendanceStatus Status { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? DistanceFromCampus { get; set; }
        public ResolutionMethod? ResolutionMethod { get; set; }
    }

    // ── Request DTO (unchanged) ──

    public class CheckInDto
    {
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? GpsAccuracy { get; set; }
        // Accepted as a plain string and parsed leniently in the controller
        // (handles "gps-high", "gpsHigh", "network", etc. from the front-end).
        public string? ResolutionMethod { get; set; }
    }
}