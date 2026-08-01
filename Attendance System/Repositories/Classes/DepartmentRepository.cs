using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.Repositories.Classes
{
    public class DepartmentRepository : GenericRepository<Department>, IDepartmentRepository
    {
        public DepartmentRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<Department?> GetByCodeAsync(string code)
        {
            return await _dbSet.FirstOrDefaultAsync(d => d.Code == code);
        }

        public async Task<IEnumerable<Department>> GetByCollegeIdAsync(string collegeId)
        {
            return await _dbSet.Where(d => d.CollegeId == collegeId).ToListAsync();
        }

        public async Task<Department?> GetDepartmentWithCollegeAsync(string departmentId)
        {
            return await _dbSet
                .Include(d => d.College)
                .FirstOrDefaultAsync(d => d.Id == departmentId && d.DeletedAt == null);
        }

        public async Task<IEnumerable<Department>> GetActiveDepartmentsAsync()
        {
            return await _dbSet
                .Where(d => d.DeletedAt == null)
                .OrderBy(d => d.Name)
                .ToListAsync();
        }

        public async Task<IEnumerable<Department>> GetActiveDepartmentsByCollegeAsync(string collegeId)
        {
            return await _dbSet
                .Where(d => d.CollegeId == collegeId && d.DeletedAt == null)
                .OrderBy(d => d.Name)
                .ToListAsync();
        }

        public async Task<bool> HasActiveEmployeesAsync(string departmentId)
        {
            return await _dbSet
                .Where(d => d.Id == departmentId && d.DeletedAt == null)
                .SelectMany(d => d.Employees)
                .AnyAsync(e => e.DeletedAt == null);
        }

        public async Task<bool> HasSubDepartmentsAsync(string departmentId)
        {
            return await _dbSet.AnyAsync(d => d.ParentId == departmentId && d.DeletedAt == null);
        }
    }
}
