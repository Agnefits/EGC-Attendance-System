using System;
using Attendance_System.Enums;

namespace Attendance_System.Models
{
    public class AttendanceLog
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public DateOnly Date { get; set; }
        public TimeOnly? CheckIn { get; set; }
        public TimeOnly? CheckOut { get; set; }
        public AttendanceStatus Status { get; set; } = AttendanceStatus.Absent;
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? GpsAccuracy { get; set; }
        public decimal? DistanceFromCampus { get; set; }
        public ResolutionMethod? ResolutionMethod { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Employee? Employee { get; set; }
    }
}
