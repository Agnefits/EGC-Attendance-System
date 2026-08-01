namespace Attendance_System.DTOs.Colleges
{
    public class CollegeListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public int DepartmentsCount { get; set; }
        public int EmployeesCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}