using System;

namespace Attendance_System.DTOs.Schedule
{
    // Client sends times as strings ("08:00" or "08:00:00") to avoid TimeOnly
    // JSON format issues; the controller parses them.
    public class CreateScheduleSessionDto
    {
        public string Subject { get; set; } = string.Empty;
        public int DayOfWeek { get; set; }          // 0=Sunday .. 6=Saturday
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public string? GroupName { get; set; }
        public string? Room { get; set; }
    }

    public class ScheduleSessionDto
    {
        public long Id { get; set; }
        public string Subject { get; set; } = string.Empty;
        public int DayOfWeek { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public string? GroupName { get; set; }
        public string? Room { get; set; }
    }
}