using Attendance_System.Enums;

namespace Attendance_System.DTOs.Auth
{
    public class AuthResponseDto
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
        public bool MustChangePassword { get; set; }
    }
}