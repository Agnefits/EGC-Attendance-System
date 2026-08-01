namespace Attendance_System.DTOs.Schedule
{
    public class AssignScheduleDto
    {
        public long ScheduleId { get; set; }
        public string? EmployeeId { get; set; }
        public string? DepartmentId { get; set; }
    }
}