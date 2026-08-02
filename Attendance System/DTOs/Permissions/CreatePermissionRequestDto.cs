using Attendance_System.Enums;

namespace Attendance_System.DTOs.Permissions
{
    public class CreatePermissionRequestDto
    {
        // Optional: only Head/Admin/Hr may set this to create a permission
        // on behalf of another employee. Ignored for normal self-requests.
        public string? EmployeeId { get; set; }
        public PermissionType PermissionType { get; set; }
        public DateOnly? Date { get; set; }
        public int DurationMinutes { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}