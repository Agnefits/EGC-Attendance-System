using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.Repositories.Classes
{
    public class UserRepository : GenericRepository<User>, IUserRepository
    {
        public UserRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            return await _dbSet.Include(u => u.Employee)
                               .FirstOrDefaultAsync(u => u.Email == email && u.DeletedAt == null);
        }

        public async Task<User?> GetByEmployeeIdAsync(string employeeId)
        {
            return await _dbSet.FirstOrDefaultAsync(u => u.EmployeeId == employeeId && u.DeletedAt == null);
        }

        public async Task<bool> ExistsByEmailAsync(string email)
        {
            return await _dbSet.AnyAsync(u => u.Email == email && u.DeletedAt == null);
        }
    }
}
