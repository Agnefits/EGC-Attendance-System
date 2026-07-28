using System;
using System.Collections.Generic;

namespace Attendance_System.Models
{
    public class LeaveType
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public int MaxAnnualDays { get; set; }
        public bool WomenOnly { get; set; }
        public bool AdminOnly { get; set; }
        public string? ColorHex { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    }
}
