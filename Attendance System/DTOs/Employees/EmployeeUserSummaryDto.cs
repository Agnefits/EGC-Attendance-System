using Attendance_System.Enums;

namespace Attendance_System.DTOs.Employees
{
    public class EmployeeUserSummaryDto
    {
        public long Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public bool IsActive { get; set; }
    }
}