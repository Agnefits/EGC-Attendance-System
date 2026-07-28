using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.Repositories.Classes
{
    public class AttendanceLogRepository : GenericRepository<AttendanceLog>, IAttendanceLogRepository
    {
        public AttendanceLogRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<AttendanceLog?> GetByEmployeeAndDateAsync(string employeeId, DateOnly date)
        {
            return await _dbSet.FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date == date);
        }

        public async Task<IEnumerable<AttendanceLog>> GetByEmployeeIdAsync(string employeeId)
        {
            return await _dbSet.Where(a => a.EmployeeId == employeeId).ToListAsync();
        }

        public async Task<IEnumerable<AttendanceLog>> GetByDateRangeAsync(DateOnly startDate, DateOnly endDate)
        {
            return await _dbSet.Where(a => a.Date >= startDate && a.Date <= endDate).ToListAsync();
        }
    }
}
