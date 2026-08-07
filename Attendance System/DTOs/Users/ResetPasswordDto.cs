using System.ComponentModel.DataAnnotations;

namespace Attendance_System.DTOs.Users
{
    public class ResetPasswordDto
    {
        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
