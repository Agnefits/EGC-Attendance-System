using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.Repositories.Classes
{
    public class ExamScheduleRepository : GenericRepository<ExamSchedule>, IExamScheduleRepository
    {
        public ExamScheduleRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<ExamSchedule>> GetByEmployeeIdAsync(string employeeId)
        {
            return await _dbSet.Where(ex => ex.EmployeeId == employeeId).ToListAsync();
        }
    }
}
