using System;
using Attendance_System.Enums;

namespace Attendance_System.Dtos
{
    // ── Request DTOs ──

    public class LoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public Gender Gender { get; set; }
        public EmployeeRoleClassification? RoleClassification { get; set; }
        public EmployeeType? Type { get; set; }
        public string? AcademicRank { get; set; }
        public string? DepartmentId { get; set; }
        public string? CollegeId { get; set; }
        public string? HeadType { get; set; }
        public UserRole? Role { get; set; }
    }

    public class ChangePasswordDto
    {
        public long UserId { get; set; }
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    // ── Response DTOs (replace anonymous objects) ──

    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public long UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? EmployeeId { get; set; }
        public string? EmployeeName { get; set; }
        public string? DepartmentId { get; set; }
        public string? Department { get; set; }
        public string? College { get; set; }
    }

    public class RegisterResponseDto
    {
        public long UserId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
    }

    public class CurrentUserDto
    {
        public long Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public CurrentUserEmployeeDto? Employee { get; set; }
    }

    public class CurrentUserEmployeeDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public Gender Gender { get; set; }
        public string? DepartmentId { get; set; }
        public string? Department { get; set; }
        public string? College { get; set; }
        public EmployeeType Type { get; set; }
        public EmployeeRoleClassification RoleClassification { get; set; }
    }
}
