using Attendance_System.DTOs.Attendance;

namespace Attendance_System.DTOs.Dashboard
{
    public class DashboardDto
    {
        public OverallDto Overall { get; set; } = new();
        public TodayDto Today { get; set; } = new();
        public int PendingLeaves { get; set; }
        public int PendingPermissions { get; set; }
        public int OnLeaveToday { get; set; }
        public List<DepartmentPerformanceDto> Departments { get; set; } = new();
        public ConsecutiveAbsencesDto ConsecutiveAbsences { get; set; } = new();
    }

    public class OverallDto
    {
        public int Present { get; set; }
        public int Absent { get; set; }
        public int Late { get; set; }
        public int Rate { get; set; }
    }

    public class TodayDto
    {
        public int Present { get; set; }
        public int Absent { get; set; }
        public int Late { get; set; }
    }

    public class DepartmentPerformanceDto
    {
        public string? DepartmentId { get; set; }
        public string Department { get; set; } = string.Empty;
        public int Present { get; set; }
        public int Absent { get; set; }
        public int Late { get; set; }
        public int Pct { get; set; }
    }

    public class ConsecutiveAbsencesDto
    {
        public int Count { get; set; }
        public List<ConsecutiveAbsentEmployeeDto> Employees { get; set; } = new();
    }

    public class ConsecutiveAbsentEmployeeDto
    {
        public string EmployeeId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }
}