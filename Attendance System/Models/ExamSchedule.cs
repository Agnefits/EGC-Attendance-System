using System;

namespace Attendance_System.Models
{
    public class ExamSchedule
    {
        public long Id { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public DateOnly Date { get; set; }
        public string? TimeSlot { get; set; }
        public string? RoomLocation { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Employee? Employee { get; set; }
    }
}
