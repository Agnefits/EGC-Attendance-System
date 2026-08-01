using Attendance_System.Enums;

namespace Attendance_System.DTOs.Permissions
{
    public class PermissionRequestDto
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public PermissionType PermissionType { get; set; }
        public DateOnly Date { get; set; }
        public int DurationMinutes { get; set; }
        public string Reason { get; set; } = string.Empty;
        public LeaveStatus Status { get; set; }
        public string? RejectionNote { get; set; }
        public string? Approver { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}