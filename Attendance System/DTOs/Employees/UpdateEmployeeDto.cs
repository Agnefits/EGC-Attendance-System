using Attendance_System.Enums;

namespace Attendance_System.DTOs.Employees
{
    public class UpdateEmployeeDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Phone { get; set; }
        public Gender? Gender { get; set; }
        public EmployeeRoleClassification? RoleClassification { get; set; }
        public EmployeeType? Type { get; set; }
        public string? AcademicRank { get; set; }
        public string? DepartmentId { get; set; }
        public string? CollegeId { get; set; }
        public string? HeadType { get; set; }
        public string? Status { get; set; }
    }
}