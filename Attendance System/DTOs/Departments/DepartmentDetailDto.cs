using Attendance_System.Enums;

namespace Attendance_System.DTOs.Departments
{
    public class DepartmentDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DepartmentType DeptType { get; set; }
        public string? CollegeId { get; set; }
        public string? CollegeName { get; set; }
        public string? ParentId { get; set; }
        public string? ParentType { get; set; }
        public string? FunctionDescription { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}