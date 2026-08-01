using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.Repositories.Classes
{
    public class CollegeRepository : GenericRepository<College>, ICollegeRepository
    {
        public CollegeRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<College?> GetByCodeAsync(string code)
        {
            return await _dbSet.FirstOrDefaultAsync(c => c.Code == code);
        }

        public async Task<College?> GetCollegeWithDepartmentsAsync(string collegeId)
        {
            return await _dbSet
                .Include(c => c.Departments.Where(d => d.DeletedAt == null))
                .FirstOrDefaultAsync(c => c.Id == collegeId && c.DeletedAt == null);
        }

        public async Task<bool> HasActiveDepartmentsAsync(string collegeId)
        {
            return await _dbSet
                .Where(c => c.Id == collegeId && c.DeletedAt == null)
                .SelectMany(c => c.Departments)
                .AnyAsync(d => d.DeletedAt == null);
        }
    }
}
