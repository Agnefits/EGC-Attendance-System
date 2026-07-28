namespace Attendance_System.Models
{
    public class ScheduleAssignment
    {
        public long Id { get; set; }
        public long ScheduleId { get; set; }
        public string? DepartmentId { get; set; }
        public string? EmployeeId { get; set; }

        public WorkSchedule? Schedule { get; set; }
        public Department? Department { get; set; }
        public Employee? Employee { get; set; }
    }
}
