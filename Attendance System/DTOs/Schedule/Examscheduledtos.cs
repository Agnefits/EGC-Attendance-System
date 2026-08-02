using System;

namespace Attendance_System.DTOs.Schedule
{
    // Client sends Date as "YYYY-MM-DD"; controller parses to DateOnly.
    public class CreateExamScheduleDto
    {
        public string Title { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string? TimeSlot { get; set; }
        public string? RoomLocation { get; set; }
        public string? Notes { get; set; }
    }

    public class ExamScheduleDto
    {
        public long Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateOnly Date { get; set; }
        public string? TimeSlot { get; set; }
        public string? RoomLocation { get; set; }
        public string? Notes { get; set; }
    }
}