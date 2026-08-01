using Attendance_System.Enums;

namespace Attendance_System.DTOs.Employees
{
    public class EmployeeListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public Gender Gender { get; set; }
        public EmployeeRoleClassification RoleClassification { get; set; }
        public EmployeeType Type { get; set; }
        public string? AcademicRank { get; set; }
        public string? HeadType { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? DepartmentId { get; set; }
        public string? CollegeId { get; set; }
        public string? Department { get; set; }
        public string? College { get; set; }
        public bool HasUserAccount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}