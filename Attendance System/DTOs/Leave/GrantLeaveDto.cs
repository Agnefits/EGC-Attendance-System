namespace Attendance_System.DTOs.Leave
{
    public class GrantLeaveDto
    {
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public List<string> TargetEmployeeIds { get; set; } = new();
    }
}
