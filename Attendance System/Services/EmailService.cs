using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Attendance_System.Services
{
    public interface IEmailService
    {
        Task<bool> SendEmailAsync(string recipientEmail, string subject, string body);
        Task<bool> SendEmailAsync(List<string> recipientEmails, string subject, string body);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendEmailAsync(string recipientEmail, string subject, string body)
        {
            try
            {
                var smtpServer = _configuration["EmailSettings:SmtpServer"];
                var smtpPortStr = _configuration["EmailSettings:SmtpPort"];
                var smtpUsername = _configuration["EmailSettings:FromEmail"];
                var smtpPassword = _configuration["EmailSettings:SmtpPassword"];
                var smtpFromName = _configuration["EmailSettings:FromName"] ?? "AITU Attendance System";

                _logger.LogInformation("==========================================");
                _logger.LogInformation($"[EMAIL SERVICE] Sending to: {recipientEmail}");
                _logger.LogInformation($"[EMAIL SERVICE] Subject: {subject}");
                _logger.LogInformation("==========================================");

                if (string.IsNullOrEmpty(smtpServer))
                {
                    _logger.LogWarning("SMTP Server not configured. Email logged to console instead of SMTP.");
                    return true;
                }

                int smtpPort = 587;
                if (!string.IsNullOrEmpty(smtpPortStr))
                {
                    int.TryParse(smtpPortStr, out smtpPort);
                }

                using (var client = new SmtpClient(smtpServer))
                {
                    client.Port = smtpPort;
                    client.Credentials = new NetworkCredential(smtpUsername, smtpPassword);
                    client.EnableSsl = true;

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(smtpUsername!, smtpFromName),
                        Subject = subject,
                        Body = body,
                        IsBodyHtml = true
                    };
                    mailMessage.To.Add(recipientEmail);

                    await client.SendMailAsync(mailMessage);
                    return true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending email to {recipientEmail}");
                return false;
            }
        }

        public async Task<bool> SendEmailAsync(List<string> recipientEmails, string subject, string body)
        {
            try
            {
                var smtpServer = _configuration["EmailSettings:SmtpServer"];
                var smtpPortStr = _configuration["EmailSettings:SmtpPort"];
                var smtpUsername = _configuration["EmailSettings:FromEmail"];
                var smtpPassword = _configuration["EmailSettings:SmtpPassword"];
                var smtpFromName = _configuration["EmailSettings:FromName"] ?? "AITU Attendance System";

                _logger.LogInformation("==========================================");
                _logger.LogInformation($"[EMAIL SERVICE] Sending batch to: {string.Join(", ", recipientEmails)}");
                _logger.LogInformation($"[EMAIL SERVICE] Subject: {subject}");
                _logger.LogInformation("==========================================");

                if (string.IsNullOrEmpty(smtpServer))
                {
                    _logger.LogWarning("SMTP Server not configured. Emails logged to console instead of SMTP.");
                    return true;
                }

                int smtpPort = 587;
                if (!string.IsNullOrEmpty(smtpPortStr))
                {
                    int.TryParse(smtpPortStr, out smtpPort);
                }

                using (var client = new SmtpClient(smtpServer))
                {
                    client.Port = smtpPort;
                    client.Credentials = new NetworkCredential(smtpUsername, smtpPassword);
                    client.EnableSsl = true;

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(smtpUsername!, smtpFromName),
                        Subject = subject,
                        Body = body,
                        IsBodyHtml = true
                    };

                    foreach (var recipientEmail in recipientEmails)
                    {
                        mailMessage.To.Add(recipientEmail);
                    }

                    await client.SendMailAsync(mailMessage);
                    return true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending batch email");
                return false;
            }
        }
    }
}
