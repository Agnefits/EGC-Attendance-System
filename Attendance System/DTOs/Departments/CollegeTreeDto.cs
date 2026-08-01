using Attendance_System.DTOs.Colleges;

namespace Attendance_System.DTOs.Departments
{
    public class CollegeTreeDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public List<CollegeDepartmentDto> Departments { get; set; } = new();
    }
}