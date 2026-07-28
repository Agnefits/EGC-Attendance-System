using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Data;
using Attendance_System.Enums;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.Repositories.Classes
{
    public class LeaveRequestRepository : GenericRepository<LeaveRequest>, ILeaveRequestRepository
    {
        public LeaveRequestRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<LeaveRequest>> GetByEmployeeIdAsync(string employeeId)
        {
            return await _dbSet.Include(lr => lr.LeaveType)
                               .Where(lr => lr.EmployeeId == employeeId)
                               .ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetPendingByDepartmentIdAsync(string departmentId)
        {
            return await _dbSet.Include(lr => lr.Employee)
                               .Include(lr => lr.LeaveType)
                               .Where(lr => lr.Status == LeaveStatus.Pending && lr.Employee != null && lr.Employee.DepartmentId == departmentId)
                               .ToListAsync();
        }
    }
}
