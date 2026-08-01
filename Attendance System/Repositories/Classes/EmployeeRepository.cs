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

        public async Task<Employee?> GetEmployeeWithDepartmentAndCollegeAsync(string employeeId)
        {
            return await _dbSet
                .Include(e => e.Department)
                .Include(e => e.College)
                .Include(e => e.User)
                .FirstOrDefaultAsync(e => e.Id == employeeId && e.DeletedAt == null);
        }

        public async Task<Employee?> GetEmployeeWithUserAsync(string employeeId)
        {
            return await _dbSet
                .Include(e => e.User)
                .FirstOrDefaultAsync(e => e.Id == employeeId && e.DeletedAt == null);
        }

        public async Task<Employee?> GetEmployeeWithDepartmentAndUserAsync(string employeeId)
        {
            return await _dbSet
                .Include(e => e.Department)
                .Include(e => e.User)
                .FirstOrDefaultAsync(e => e.Id == employeeId && e.DeletedAt == null);
        }

        public async Task<IEnumerable<Employee>> GetActiveEmployeesByDepartmentAsync(string departmentId)
        {
            return await _dbSet
                .Where(e => e.DepartmentId == departmentId && e.DeletedAt == null && e.Status == "active")
                .ToListAsync();
        }

        public async Task<int> GetActiveEmployeesCountAsync()
        {
            return await _dbSet.CountAsync(e => e.DeletedAt == null && e.Status == "active");
        }

        public async Task<int> GetActiveEmployeesCountByDepartmentAsync(string departmentId)
        {
            return await _dbSet.CountAsync(e => e.DepartmentId == departmentId && e.DeletedAt == null && e.Status == "active");
        }

        public async Task<string?> GetDepartmentIdByEmployeeIdAsync(string employeeId)
        {
            return await _dbSet
                .Where(e => e.Id == employeeId && e.DeletedAt == null)
                .Select(e => e.DepartmentId)
                .FirstOrDefaultAsync();
        }
    }
}
