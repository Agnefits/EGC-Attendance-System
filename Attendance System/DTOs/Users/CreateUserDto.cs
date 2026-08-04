using Attendance_System.Enums;

namespace Attendance_System.DTOs.Users
{
    // Used by POST /api/users to attach a new login account to an existing employee.
    public class CreateUserDto
    {
        public string EmployeeId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public UserRole Role { get; set; } = UserRole.Employee;
    }
}
