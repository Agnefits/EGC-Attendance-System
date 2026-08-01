using Attendance_System.Enums;

namespace Attendance_System.DTOs.Attendance
{
    public class AttendanceDto
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
}