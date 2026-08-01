using Attendance_System.Enums;

namespace Attendance_System.DTOs.Users
{
    public class UserListItemDto
    {
        public long Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public UserEmployeeSummaryDto? Employee { get; set; }
    }
}