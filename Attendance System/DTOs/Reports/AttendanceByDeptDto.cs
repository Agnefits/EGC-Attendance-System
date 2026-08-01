namespace Attendance_System.DTOs.Reports
{
    public class AttendanceByDeptDto
    {
        public string DepartmentId { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public int Total { get; set; }
        public int Present { get; set; }
        public int Absent { get; set; }
        public int Late { get; set; }
        public int Pct { get; set; }
    }
}