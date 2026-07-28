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
    public class PermissionRequestRepository : GenericRepository<PermissionRequest>, IPermissionRequestRepository
    {
        public PermissionRequestRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<PermissionRequest>> GetByEmployeeIdAsync(string employeeId)
        {
            return await _dbSet.Where(pr => pr.EmployeeId == employeeId).ToListAsync();
        }

        public async Task<IEnumerable<PermissionRequest>> GetPendingByDepartmentIdAsync(string departmentId)
        {
            return await _dbSet.Include(pr => pr.Employee)
                               .Where(pr => pr.Status == LeaveStatus.Pending && pr.Employee != null && pr.Employee.DepartmentId == departmentId)
                               .ToListAsync();
        }
    }
}
