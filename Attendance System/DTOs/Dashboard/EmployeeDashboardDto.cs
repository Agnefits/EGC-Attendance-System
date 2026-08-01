using Attendance_System.Enums;

namespace Attendance_System.DTOs.Dashboard
{
    public class EmployeeDashboardDto
    {
        public AttendanceStatsDto Attendance { get; set; } = new();
        public TodayRecordDto? Today { get; set; }
        public int MonthPresentDays { get; set; }
        public int PendingLeaves { get; set; }
        public int ApprovedLeaves { get; set; }
        public int UsedPermissionMinutes { get; set; }
    }

    public class AttendanceStatsDto
    {
        public int Present { get; set; }
        public int Absent { get; set; }
        public int Late { get; set; }
    }

    public class TodayRecordDto
    {
        public AttendanceStatus Status { get; set; }
        public TimeOnly? CheckIn { get; set; }
        public TimeOnly? CheckOut { get; set; }
    }
}