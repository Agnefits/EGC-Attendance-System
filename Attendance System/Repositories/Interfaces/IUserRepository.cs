using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface IUserRepository : IGenericRepository<User>
    {
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByEmployeeIdAsync(string employeeId);
        Task<bool> ExistsByEmailAsync(string email);

        Task<User?> GetUserWithEmployeeAsync(long userId);
        Task<User?> GetUserWithEmployeeByEmailAsync(string email);
        Task<User?> GetUserWithEmployeeAndDeptAsync(long userId);
    }
}
