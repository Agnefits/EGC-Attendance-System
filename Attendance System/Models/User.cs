using System;
using Attendance_System.Enums;
namespace Attendance_System.Models
{
    public class User
    {
        public long Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public UserRole Role { get; set; } = UserRole.Employee;
        public string? EmployeeId { get; set; }
        public bool IsActive { get; set; } = true;
        public bool MustChangePassword { get; set; } = true;
        // One-time code for the "forgot password" flow (6 digits, cleared after use or expiry).
        public string? ResetOtp { get; set; }
        public DateTime? ResetOtpExpiresAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; }
        public Employee? Employee { get; set; }
    }
}