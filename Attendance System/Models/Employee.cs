using System;
using System.Collections.Generic;
using Attendance_System.Enums;

namespace Attendance_System.Models
{
    public class Employee
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public Gender Gender { get; set; } = Gender.Male;
        public EmployeeRoleClassification RoleClassification { get; set; } = EmployeeRoleClassification.Academic;
        public EmployeeType Type { get; set; } = EmployeeType.Academic;
        public string? AcademicRank { get; set; }
        public string? DepartmentId { get; set; }
        public string? CollegeId { get; set; }
        public string? HeadType { get; set; }
        public string Status { get; set; } = "active";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; }

        public User? User { get; set; }
        public Department? Department { get; set; }
        public College? College { get; set; }
        public ICollection<AttendanceLog> AttendanceLogs { get; set; } = new List<AttendanceLog>();
        public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
        public ICollection<PermissionRequest> PermissionRequests { get; set; } = new List<PermissionRequest>();
        public ICollection<ExamSchedule> ExamSchedules { get; set; } = new List<ExamSchedule>();
        public ICollection<ScheduleAssignment> ScheduleAssignments { get; set; } = new List<ScheduleAssignment>();
    }
}
