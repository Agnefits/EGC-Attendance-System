namespace Attendance_System.DTOs.Reports
{
    public class LeaveByTypeDto
    {
        public string LeaveTypeId { get; set; } = string.Empty;
        public string LeaveType { get; set; } = string.Empty;
        public int Total { get; set; }
        public int Approved { get; set; }
        public int Pending { get; set; }
        public int Rejected { get; set; }
    }
}