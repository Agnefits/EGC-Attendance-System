namespace Attendance_System.DTOs.Attendance
{
    public class AttendanceSummaryDto
    {
        public DateOnly Date { get; set; }
        public int TotalEmployees { get; set; }
        public int CheckedIn { get; set; }
        public int CheckedOut { get; set; }
        public List<AttendanceDto> Details { get; set; } = new();
    }
}