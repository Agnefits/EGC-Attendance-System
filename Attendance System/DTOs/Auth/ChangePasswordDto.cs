namespace Attendance_System.DTOs.Auth
{
    public class ChangePasswordDto
    {
        // Kept for backward compatibility with any existing callers, but the server
        // no longer trusts this value -- the target user is always the authenticated
        // caller (resolved from the JWT), never whatever id is sent in the body.
        public long UserId { get; set; }
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}