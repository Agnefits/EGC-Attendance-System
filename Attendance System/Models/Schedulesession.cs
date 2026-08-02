using System;

namespace Attendance_System.Models
{
    // A single teaching/work session in an employee's personal weekly schedule
    // (e.g. "software", Monday, 08:00–09:00, group A1, room A101).
    // This is separate from WorkSchedule (attendance timing) and ScheduleAssignment.
    public class ScheduleSession
    {
        public long Id { get; set; }

        // Owner of the session. Employee.Id is a string (GUID) in this system.
        public string EmployeeId { get; set; } = string.Empty;
        public Employee? Employee { get; set; }

        public string Subject { get; set; } = string.Empty;

        // 0 = Sunday, 1 = Monday, ... 6 = Saturday (matches JS Date.getDay()).
        public int DayOfWeek { get; set; }

        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }

        public string? GroupName { get; set; }
        public string? Room { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}