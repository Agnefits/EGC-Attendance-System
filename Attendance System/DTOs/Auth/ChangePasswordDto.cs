namespace Attendance_System.DTOs.Auth
{
    public class ChangePasswordDto
    {
        public long UserId { get; set; }
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}