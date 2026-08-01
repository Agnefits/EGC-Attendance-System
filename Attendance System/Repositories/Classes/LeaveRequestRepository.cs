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

        public async Task<IEnumerable<LeaveRequest>> GetByEmployeeIdWithDetailsAsync(string employeeId)
        {
            return await _dbSet
                .Include(l => l.Employee)
                .Include(l => l.LeaveType)
                .Include(l => l.Manager)
                .Where(l => l.EmployeeId == employeeId)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetPendingWithDetailsAsync()
        {
            return await _dbSet
                .Include(l => l.Employee).ThenInclude(e => e!.Department)
                .Include(l => l.LeaveType)
                .Include(l => l.Manager)
                .Where(l => l.Status == LeaveStatus.Pending)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<LeaveRequest>> GetPendingByDepartmentWithDetailsAsync(string departmentId)
        {
            return await _dbSet
                .Include(l => l.Employee).ThenInclude(e => e!.Department)
                .Include(l => l.LeaveType)
                .Include(l => l.Manager)
                .Where(l => l.Status == LeaveStatus.Pending && l.Employee!.DepartmentId == departmentId)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
        }

        public async Task<LeaveRequest?> GetLeaveRequestWithDetailsAsync(string id)
        {
            return await _dbSet
                .Include(l => l.Employee)
                .Include(l => l.LeaveType)
                .Include(l => l.Manager)
                .FirstOrDefaultAsync(l => l.Id == id);
        }

        public async Task<int> GetPendingCountAsync()
        {
            return await _dbSet.CountAsync(l => l.Status == LeaveStatus.Pending);
        }

        public async Task<int> GetPendingCountByDepartmentAsync(string departmentId)
        {
            return await _dbSet
                .Include(l => l.Employee)
                .CountAsync(l => l.Status == LeaveStatus.Pending && l.Employee!.DepartmentId == departmentId);
        }

        public async Task<int> GetApprovedCountByEmployeeAndTypeAsync(string employeeId, string leaveTypeId, DateOnly fromDate, DateOnly toDate)
        {
            return await _dbSet
                .CountAsync(l => l.EmployeeId == employeeId && l.LeaveTypeId == leaveTypeId
                    && l.Status == LeaveStatus.Approved && l.FromDate >= fromDate && l.FromDate <= toDate);
        }

        public async Task<int> GetApprovedLeaveDaysByEmployeeAndTypeAsync(string employeeId, string leaveTypeId, DateOnly fromDate, DateOnly toDate)
        {
            return await _dbSet
                .Where(l => l.EmployeeId == employeeId && l.LeaveTypeId == leaveTypeId
                    && l.Status == LeaveStatus.Approved && l.FromDate >= fromDate && l.FromDate <= toDate)
                .SumAsync(l => (int?)l.DaysCount) ?? 0;
        }

        public async Task<int> GetApprovedLeavesOnDateAsync(DateOnly date)
        {
            return await _dbSet
                .CountAsync(l => l.Status == LeaveStatus.Approved && l.FromDate <= date && l.ToDate >= date);
        }
    }
}
