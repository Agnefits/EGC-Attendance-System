using Attendance_System.Enums;

namespace Attendance_System.DTOs.Leave
{
    public class CreateLeaveRequestDto
    {
        public string LeaveTypeId { get; set; } = string.Empty;
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public MaternityMode? MaternityMode { get; set; }
    }
}