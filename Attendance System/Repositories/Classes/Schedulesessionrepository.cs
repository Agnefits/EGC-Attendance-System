using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.Repositories.Classes
{
    public class ScheduleSessionRepository : GenericRepository<ScheduleSession>, IScheduleSessionRepository
    {
        public ScheduleSessionRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<ScheduleSession>> GetByEmployeeIdAsync(string employeeId)
        {
            return await _dbSet
                .Where(s => s.EmployeeId == employeeId)
                .OrderBy(s => s.DayOfWeek).ThenBy(s => s.StartTime)
                .ToListAsync();
        }
    }
}