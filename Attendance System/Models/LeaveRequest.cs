using System;
using Attendance_System.Enums;

namespace Attendance_System.Models
{
    public class LeaveRequest
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string LeaveTypeId { get; set; } = string.Empty;
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public int DaysCount { get; set; }
        public LeaveStatus Status { get; set; } = LeaveStatus.Pending;
        public string Reason { get; set; } = string.Empty;
        public string? RejectionNote { get; set; }
        public string? ManagerId { get; set; }
        public bool GrantedByAdmin { get; set; }
        public MaternityMode? MaternityMode { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Employee? Employee { get; set; }
        public LeaveType? LeaveType { get; set; }
        public Employee? Manager { get; set; }
    }
}
