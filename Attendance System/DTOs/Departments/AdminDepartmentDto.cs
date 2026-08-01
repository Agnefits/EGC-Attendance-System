using Attendance_System.Enums;

namespace Attendance_System.DTOs.Departments
{
    public class AdminDepartmentDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DepartmentType DeptType { get; set; }
        public string? ParentType { get; set; }
    }
}