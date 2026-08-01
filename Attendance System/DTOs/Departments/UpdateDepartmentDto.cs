using Attendance_System.Enums;

namespace Attendance_System.DTOs.Departments
{
    public class UpdateDepartmentDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Code { get; set; }
        public DepartmentType? DeptType { get; set; }
        public string? CollegeId { get; set; }
        public string? ParentId { get; set; }
        public string? ParentType { get; set; }
        public string? FunctionDescription { get; set; }
    }
}