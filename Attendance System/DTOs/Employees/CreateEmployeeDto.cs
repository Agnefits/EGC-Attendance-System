using Attendance_System.Enums;

namespace Attendance_System.DTOs.Employees
{
    public class CreateEmployeeDto
    {
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public Gender Gender { get; set; }
        public EmployeeRoleClassification? RoleClassification { get; set; }
        public EmployeeType? Type { get; set; }
        public string? AcademicRank { get; set; }
        public string? DepartmentId { get; set; }
        public string? CollegeId { get; set; }
        public string? HeadType { get; set; }
    }
}