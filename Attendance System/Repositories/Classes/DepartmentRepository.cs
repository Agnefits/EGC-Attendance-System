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
    }
}
