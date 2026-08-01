namespace Attendance_System.DTOs.Dashboard
{
    public class HeadDashboardDto
    {
        public string? DepartmentId { get; set; }
        public int EmployeesCount { get; set; }
        public OverallDto Overall { get; set; } = new();
        public int PendingLeaves { get; set; }
        public int PendingPermissions { get; set; }
        public ConsecutiveAbsencesDto ConsecutiveAbsences { get; set; } = new();
    }
}