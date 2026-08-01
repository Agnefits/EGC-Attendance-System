using Attendance_System.Enums;

namespace Attendance_System.DTOs.Users
{
    public class UserEmployeeDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public Gender Gender { get; set; }
        public string? Department { get; set; }
        public string? College { get; set; }
        public EmployeeType Type { get; set; }
        public EmployeeRoleClassification RoleClassification { get; set; }
    }
}