using System;

namespace Attendance_System.Models
{
    // Key/value store for system-wide configuration (campus geofence, quotas, etc.).
    // Requires: add `public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();`
    // to AppDbContext, configure the key in OnModelCreating, then add a migration.
    public class SystemSetting
    {
        public string Key { get; set; } = string.Empty;   // e.g. "campus.lat", "permissions.monthlyMinutes"
        public string Value { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}