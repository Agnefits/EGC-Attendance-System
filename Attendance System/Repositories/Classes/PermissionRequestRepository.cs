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

        public async Task<IEnumerable<PermissionRequest>> GetByEmployeeIdWithDetailsAsync(string employeeId)
        {
            return await _dbSet
                .Include(p => p.Employee).ThenInclude(e => e!.Department)
                .Include(p => p.Approver)
                .Where(p => p.EmployeeId == employeeId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<PermissionRequest>> GetPendingWithDetailsAsync()
        {
            return await _dbSet
                .Include(p => p.Employee).ThenInclude(e => e!.Department)
                .Include(p => p.Approver)
                .Where(p => p.Status == LeaveStatus.Pending)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<PermissionRequest>> GetPendingByDepartmentWithDetailsAsync(string departmentId)
        {
            return await _dbSet
                .Include(p => p.Employee).ThenInclude(e => e!.Department)
                .Include(p => p.Approver)
                .Where(p => p.Status == LeaveStatus.Pending && p.Employee!.DepartmentId == departmentId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<PermissionRequest?> GetPermissionRequestWithDetailsAsync(string id)
        {
            return await _dbSet
                .Include(p => p.Employee)
                .Include(p => p.Approver)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<int> GetPendingCountAsync()
        {
            return await _dbSet.CountAsync(p => p.Status == LeaveStatus.Pending);
        }

        public async Task<int> GetPendingCountByDepartmentAsync(string departmentId)
        {
            return await _dbSet
                .Include(p => p.Employee)
                .CountAsync(p => p.Status == LeaveStatus.Pending && p.Employee!.DepartmentId == departmentId);
        }

        public async Task<int> GetUsedMinutesByEmployeeAndDateRangeAsync(string employeeId, DateOnly startDate, DateOnly endDate)
        {
            return await _dbSet
                .Where(p => p.EmployeeId == employeeId && p.Status == LeaveStatus.Approved && p.Date >= startDate && p.Date <= endDate)
                .SumAsync(p => (int?)p.DurationMinutes) ?? 0;
        }

        public async Task<int> GetUsedMinutesByEmployeeAndDateRangeExcludingNursingAsync(string employeeId, DateOnly startDate, DateOnly endDate)
        {
            return await _dbSet
                .Where(p => p.EmployeeId == employeeId && p.PermissionType != PermissionType.Nursing
                    && p.Status == LeaveStatus.Approved && p.Date >= startDate && p.Date <= endDate)
                .SumAsync(p => (int?)p.DurationMinutes) ?? 0;
        }

        // إضافات جديدة
        public async Task<IEnumerable<PermissionRequest>> GetAllByDepartmentWithDetailsAsync(string departmentId)
        {
            return await _dbSet
                .Include(p => p.Employee).ThenInclude(e => e!.Department)
                .Include(p => p.Approver)
                .Where(p => p.Employee != null && p.Employee.DepartmentId == departmentId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<PermissionRequest>> GetAllByEmployeeWithDetailsAsync(string employeeId)
        {
            return await _dbSet
                .Include(p => p.Employee).ThenInclude(e => e!.Department)
                .Include(p => p.Approver)
                .Where(p => p.EmployeeId == employeeId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<PermissionRequest>> GetAllWithDetailsAsync()
        {
            return await _dbSet
                .Include(p => p.Employee).ThenInclude(e => e!.Department)
                .Include(p => p.Approver)
                .Where(p => p.Employee != null && p.Employee.DeletedAt == null)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }
    }
}