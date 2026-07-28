using System;
using Attendance_System.Enums;

namespace Attendance_System.Models
{
    public class PermissionRequest
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public PermissionType PermissionType { get; set; } = PermissionType.Morning;
        public DateOnly? Date { get; set; }
        public int DurationMinutes { get; set; }
        public LeaveStatus Status { get; set; } = LeaveStatus.Pending;
        public string Reason { get; set; } = string.Empty;
        public string? RejectionNote { get; set; }
        public string? ApprovedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Employee? Employee { get; set; }
        public Employee? Approver { get; set; }
    }
}
