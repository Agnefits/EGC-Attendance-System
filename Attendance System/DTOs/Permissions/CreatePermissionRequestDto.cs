using Attendance_System.Enums;

namespace Attendance_System.DTOs.Permissions
{
    public class CreatePermissionRequestDto
    {
        public PermissionType PermissionType { get; set; }
        public DateOnly? Date { get; set; }
        public int DurationMinutes { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}