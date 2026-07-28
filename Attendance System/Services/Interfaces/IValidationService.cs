using System;
using System.Threading.Tasks;

namespace Attendance_System.Services.Interfaces
{
    public interface IValidationService
    {
        Task ValidateEmployeeEmailAsync(string email, string? excludeEmployeeId = null);
        Task ValidateUserEmailAsync(string email, long? excludeUserId = null);
    }
}
