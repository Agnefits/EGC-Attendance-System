namespace Attendance_System.DTOs.Reports
{
    public class ReportSummaryDto
    {
        public int TotalEmployees { get; set; }
        public RangeDto? Range { get; set; }
        public int Present { get; set; }
        public int Absent { get; set; }
        public int Late { get; set; }
        public int AttendanceRate { get; set; }
        public TodaySummaryDto Today { get; set; } = new();
        public int PendingLeaves { get; set; }
        public int PendingPermissions { get; set; }
        public int OnLeaveToday { get; set; }
    }

    public class RangeDto
    {
        public DateOnly? From { get; set; }
        public DateOnly? To { get; set; }
    }

    public class TodaySummaryDto
    {
        public int Present { get; set; }
        public int Absent { get; set; }
        public int Late { get; set; }
    }
}