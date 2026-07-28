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
    }
}
