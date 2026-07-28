using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Attendance_System.UnitOfWork;
using Attendance_System.Enums;

namespace Attendance_System.Services
{
    public class AttendanceNotificationService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AttendanceNotificationService> _logger;
        private static readonly ConcurrentDictionary<string, bool> _sentNotifications = new();

        public AttendanceNotificationService(IServiceProvider serviceProvider, ILogger<AttendanceNotificationService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Attendance Notification Background Worker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessAttendanceNotificationsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred processing attendance notifications.");
                }

                // Run every 1 hour
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }

        private async Task ProcessAttendanceNotificationsAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            
            // Query employees who have not checked in for today
            var employees = await unitOfWork.Employees.GetAllAsync();
            foreach (var employee in employees)
            {
                var log = await unitOfWork.AttendanceLogs.GetByEmployeeAndDateAsync(employee.Id, today);
                if (log == null)
                {
                    string notificationKey = $"no-checkin-{employee.Id}-{today:yyyy-MM-dd}";
                    if (_sentNotifications.TryAdd(notificationKey, true))
                    {
                        if (!string.IsNullOrEmpty(employee.Email))
                        {
                            string subject = "[تنبيه حضور] لم يتم تسجيل الحضور اليوم";
                            string body = $"<p>مرحباً <strong>{employee.Name}</strong>،</p><p>يرجى العلم أنه لم يتم تسجيل حضورك ليوم {today:yyyy-MM-dd} حتى الآن.</p>";
                            await emailService.SendEmailAsync(employee.Email, subject, body);
                        }
                    }
                }
            }
        }
    }
}
