using Attendance_System.Enums;

namespace Attendance_System.DTOs.Users
{
    public class UpdateUserDto
    {
        public string? Email { get; set; }
        public UserRole? Role { get; set; }
        public bool? IsActive { get; set; }
    }
}