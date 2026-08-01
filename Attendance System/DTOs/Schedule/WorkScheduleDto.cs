using Attendance_System.Enums;

namespace Attendance_System.DTOs.Schedule
{
    public class WorkScheduleDto
    {
        public long Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public ScheduleTimeMode TimeMode { get; set; }
        public TimeOnly? CheckInTime { get; set; }
        public TimeOnly? CheckOutTime { get; set; }
        public decimal HoursPerDay { get; set; }
        public int DaysPerWeek { get; set; }
        public TargetScope TargetScope { get; set; }
    }
}