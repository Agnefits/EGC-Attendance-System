using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Services.Interfaces;
using Attendance_System.UnitOfWork;
using Attendance_System.Validation;

namespace Attendance_System.Services.Classes
{
    public class ValidationService : IValidationService
    {
        private readonly IUnitOfWork _unitOfWork;

        public ValidationService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task ValidateEmployeeEmailAsync(string email, string? excludeEmployeeId = null)
        {
            var errors = new Dictionary<string, string[]>();

            var existingEmp = await _unitOfWork.Employees.GetByEmailAsync(email);
            if (existingEmp != null && (excludeEmployeeId == null || existingEmp.Id != excludeEmployeeId))
            {
                errors.Add("Email", new[] { "Employee email already exists." });
            }

            if (errors.Count > 0)
            {
                throw new BusinessValidationException(errors);
            }
        }

        public async Task ValidateUserEmailAsync(string email, long? excludeUserId = null)
        {
            var errors = new Dictionary<string, string[]>();

            var existingUser = await _unitOfWork.Users.GetByEmailAsync(email);
            if (existingUser != null && (excludeUserId == null || existingUser.Id != excludeUserId))
            {
                errors.Add("Email", new[] { "User email already exists." });
            }

            if (errors.Count > 0)
            {
                throw new BusinessValidationException(errors);
            }
        }
    }
}
