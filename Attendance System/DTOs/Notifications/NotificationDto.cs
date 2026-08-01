namespace Attendance_System.DTOs.Notifications
{
    public class NotificationDto
    {
        public string Id { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public NotificationTitleDto Title { get; set; } = new();
        public NotificationDescDto Desc { get; set; } = new();
        public bool Unread { get; set; }
    }

    public class NotificationTitleDto
    {
        public string Ar { get; set; } = string.Empty;
        public string En { get; set; } = string.Empty;
    }

    public class NotificationDescDto
    {
        public string Ar { get; set; } = string.Empty;
        public string En { get; set; } = string.Empty;
    }
}