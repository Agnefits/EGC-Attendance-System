using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.Repositories.Classes
{
    public class EmployeeRepository : GenericRepository<Employee>, IEmployeeRepository
    {
        public EmployeeRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<Employee?> GetByEmailAsync(string email)
        {
            return await _dbSet.FirstOrDefaultAsync(e => e.Email == email && e.DeletedAt == null);
        }

        public async Task<IEnumerable<Employee>> GetByDepartmentIdAsync(string departmentId)
        {
            return await _dbSet.Where(e => e.DepartmentId == departmentId && e.DeletedAt == null).ToListAsync();
        }

        public async Task<IEnumerable<Employee>> GetByCollegeIdAsync(string collegeId)
        {
            return await _dbSet.Where(e => e.CollegeId == collegeId && e.DeletedAt == null).ToListAsync();
        }
    }
}
