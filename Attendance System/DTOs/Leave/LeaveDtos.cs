using System;
using Attendance_System.Enums;

namespace Attendance_System.Dtos
{
    // ── Response DTOs ──

    public class LeaveRequestListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string LeaveTypeId { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty;
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public int DaysCount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public LeaveStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Manager { get; set; }
        public string? RejectionNote { get; set; }
        public bool GrantedByAdmin { get; set; }
        public MaternityMode? MaternityMode { get; set; }
    }

    public class MyLeaveRequestDto
    {
        public string Id { get; set; } = string.Empty;
        public string LeaveTypeId { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty;
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public int DaysCount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public LeaveStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? RejectionNote { get; set; }
    }

    public class LeaveRequestResultDto
    {
        public string Id { get; set; } = string.Empty;
        public int DaysCount { get; set; }
        public LeaveStatus Status { get; set; }
    }

    public class LeaveRequestApprovalResultDto
    {
        public string Id { get; set; } = string.Empty;
        public LeaveStatus Status { get; set; }
    }

    // ── Request DTOs ──

    public class CreateLeaveRequestDto
    {
        public string LeaveTypeId { get; set; } = string.Empty;
        public DateOnly FromDate { get; set; }
        public DateOnly ToDate { get; set; }
        public string Reason { get; set; } = string.Empty;
        public MaternityMode? MaternityMode { get; set; }
        // DaysCount intentionally omitted — the server computes it (Fridays excluded).
    }

    public class ApproveLeaveDto
    {
        public bool Approved { get; set; }
        public string? RejectionNote { get; set; }
    }
}
