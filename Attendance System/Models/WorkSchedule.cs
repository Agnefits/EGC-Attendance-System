using System;
using System.Collections.Generic;
using Attendance_System.Enums;

namespace Attendance_System.Models
{
    public class WorkSchedule
    {
        public long Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public ScheduleTimeMode TimeMode { get; set; } = ScheduleTimeMode.Fixed;
        public TimeOnly? CheckInTime { get; set; }
        public TimeOnly? CheckOutTime { get; set; }
        public decimal HoursPerDay { get; set; } = 8.00m;
        public int DaysPerWeek { get; set; } = 5;
        public TargetScope TargetScope { get; set; } = TargetScope.All;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ScheduleAssignment> Assignments { get; set; } = new List<ScheduleAssignment>();
    }
}
