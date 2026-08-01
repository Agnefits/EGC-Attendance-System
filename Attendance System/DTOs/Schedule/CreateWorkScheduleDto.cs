using Attendance_System.Enums;

namespace Attendance_System.DTOs.Schedule
{
    public class CreateWorkScheduleDto
    {
        public string Title { get; set; } = string.Empty;
        public ScheduleTimeMode TimeMode { get; set; }
        public TimeOnly? CheckInTime { get; set; }
        public TimeOnly? CheckOutTime { get; set; }
        public decimal HoursPerDay { get; set; } = 8.00m;
        public int DaysPerWeek { get; set; } = 5;
        public TargetScope TargetScope { get; set; }
    }
}