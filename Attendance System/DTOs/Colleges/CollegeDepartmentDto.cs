using Attendance_System.Enums;

namespace Attendance_System.DTOs.Colleges
{
    public class CollegeDepartmentDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DepartmentType DeptType { get; set; }
    }
}