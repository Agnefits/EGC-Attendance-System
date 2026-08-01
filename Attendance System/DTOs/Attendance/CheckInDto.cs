using Attendance_System.Enums;

namespace Attendance_System.DTOs.Attendance
{
    public class CheckInDto
    {
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? GpsAccuracy { get; set; }
        public ResolutionMethod? ResolutionMethod { get; set; }
    }
}