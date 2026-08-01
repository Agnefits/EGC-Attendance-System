using Attendance_System.Enums;

namespace Attendance_System.DTOs.Leave
{
    public class MyLeaveRequestDto
    {
        public string Id { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty;
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public int DaysCount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public LeaveStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? RejectionNote { get; set; }
    }
}