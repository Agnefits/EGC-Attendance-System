using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Enums;
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

        public async Task<IEnumerable<AttendanceLog>> GetByEmployeeIdWithDetailsAsync(string employeeId)
        {
            return await _dbSet
                .Include(a => a.Employee)
                .ThenInclude(e => e!.Department)
                .Include(a => a.Employee)
                .ThenInclude(e => e!.College)
                .Where(a => a.EmployeeId == employeeId)
                .OrderByDescending(a => a.Date)
                .ToListAsync();
        }

        public async Task<IEnumerable<AttendanceLog>> GetByDateRangeWithDetailsAsync(DateOnly startDate, DateOnly endDate)
        {
            return await _dbSet
                .Include(a => a.Employee)
                .ThenInclude(e => e!.Department)
                .Include(a => a.Employee)
                .ThenInclude(e => e!.College)
                .Where(a => a.Date >= startDate && a.Date <= endDate)
                .OrderByDescending(a => a.Date)
                .ToListAsync();
        }

        public async Task<AttendanceLog?> GetByIdWithEmployeeAsync(string id)
        {
            return await _dbSet
                .Include(a => a.Employee)
                .ThenInclude(e => e!.Department)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<bool> ExistsForEmployeeOnDateAsync(string employeeId, DateOnly date)
        {
            return await _dbSet.AnyAsync(a => a.EmployeeId == employeeId && a.Date == date);
        }

        public async Task<int> GetTotalCountAsync()
        {
            return await _dbSet.CountAsync();
        }

        public async Task<int> GetCountByStatusAsync(AttendanceStatus status)
        {
            return await _dbSet.CountAsync(a => a.Status == status);
        }

        public async Task<int> GetCountByStatusAndDateAsync(AttendanceStatus status, DateOnly date)
        {
            return await _dbSet.CountAsync(a => a.Status == status && a.Date == date);
        }

        // ≈÷«›«  ÃœÌœ… ··›· —… ›Ì ﬁ«⁄œ… «·»Ì«‰« 

        public async Task<IEnumerable<AttendanceLog>> GetFilteredAsync(
            DateOnly? from,
            DateOnly? to,
            string? employeeId,
            string? departmentId,
            AttendanceStatus? status,
            int page,
            int pageSize)
        {
            var query = _dbSet
                .Include(a => a.Employee)
                .ThenInclude(e => e!.Department)
                .Include(a => a.Employee)
                .ThenInclude(e => e!.College)
                .AsQueryable();

            if (from.HasValue)
                query = query.Where(a => a.Date >= from.Value);
            if (to.HasValue)
                query = query.Where(a => a.Date <= to.Value);
            if (!string.IsNullOrEmpty(employeeId))
                query = query.Where(a => a.EmployeeId == employeeId);
            if (!string.IsNullOrEmpty(departmentId))
                query = query.Where(a => a.Employee != null && a.Employee.DepartmentId == departmentId);
            if (status.HasValue)
                query = query.Where(a => a.Status == status.Value);

            return await query
                .OrderByDescending(a => a.Date)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetFilteredCountAsync(
            DateOnly? from,
            DateOnly? to,
            string? employeeId,
            string? departmentId,
            AttendanceStatus? status)
        {
            var query = _dbSet.AsQueryable();

            if (from.HasValue)
                query = query.Where(a => a.Date >= from.Value);
            if (to.HasValue)
                query = query.Where(a => a.Date <= to.Value);
            if (!string.IsNullOrEmpty(employeeId))
                query = query.Where(a => a.EmployeeId == employeeId);
            if (!string.IsNullOrEmpty(departmentId))
                query = query.Where(a => a.Employee != null && a.Employee.DepartmentId == departmentId);
            if (status.HasValue)
                query = query.Where(a => a.Status == status.Value);

            return await query.CountAsync();
        }

        public async Task<IEnumerable<AttendanceLog>> GetByDateRangeWithFiltersAsync(
            DateOnly? from,
            DateOnly? to,
            string? departmentId)
        {
            var query = _dbSet
                .Include(a => a.Employee)
                .ThenInclude(e => e!.Department)
                .AsQueryable();

            if (from.HasValue)
                query = query.Where(a => a.Date >= from.Value);
            if (to.HasValue)
                query = query.Where(a => a.Date <= to.Value);
            if (!string.IsNullOrEmpty(departmentId))
                query = query.Where(a => a.Employee != null && a.Employee.DepartmentId == departmentId);

            return await query
                .OrderByDescending(a => a.Date)
                .ToListAsync();
        }

        public async Task<Dictionary<AttendanceStatus, int>> GetStatusCountsAsync(
            DateOnly? from,
            DateOnly? to,
            string? departmentId)
        {
            var query = _dbSet.AsQueryable();

            if (from.HasValue)
                query = query.Where(a => a.Date >= from.Value);
            if (to.HasValue)
                query = query.Where(a => a.Date <= to.Value);
            if (!string.IsNullOrEmpty(departmentId))
                query = query.Where(a => a.Employee != null && a.Employee.DepartmentId == departmentId);

            var result = await query
                .GroupBy(a => a.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

            var dict = new Dictionary<AttendanceStatus, int>();
            foreach (var item in result)
            {
                dict[item.Status] = item.Count;
            }

            foreach (AttendanceStatus status in Enum.GetValues(typeof(AttendanceStatus)))
            {
                if (!dict.ContainsKey(status))
                    dict[status] = 0;
            }

            return dict;
        }

        public async Task<IEnumerable<AttendanceLog>> GetByDepartmentWithDateRangeAsync(
            string departmentId,
            DateOnly? from,
            DateOnly? to)
        {
            var query = _dbSet
                .Include(a => a.Employee)
                .ThenInclude(e => e!.Department)
                .Where(a => a.Employee != null && a.Employee.DepartmentId == departmentId);

            if (from.HasValue)
                query = query.Where(a => a.Date >= from.Value);
            if (to.HasValue)
                query = query.Where(a => a.Date <= to.Value);

            return await query
                .OrderByDescending(a => a.Date)
                .ToListAsync();
        }

        public async Task<IEnumerable<AttendanceLog>> GetByEmployeeWithDateRangeAsync(
            string employeeId,
            DateOnly? from,
            DateOnly? to)
        {
            var query = _dbSet
                .Where(a => a.EmployeeId == employeeId);

            if (from.HasValue)
                query = query.Where(a => a.Date >= from.Value);
            if (to.HasValue)
                query = query.Where(a => a.Date <= to.Value);

            return await query
                .OrderByDescending(a => a.Date)
                .ToListAsync();
        }

        public async Task<int> GetCountByEmployeeAndDateRangeAsync(string employeeId, DateOnly startDate, DateOnly endDate)
        {
            return await _dbSet
                .Where(a => a.EmployeeId == employeeId &&
                           a.Date >= startDate &&
                           a.Date <= endDate &&
                           (a.Status == AttendanceStatus.Present ||
                            a.Status == AttendanceStatus.Left ||
                            a.Status == AttendanceStatus.Late))
                .CountAsync();
        }

        public async Task<int> GetCountByEmployeeAndStatusAsync(string employeeId, AttendanceStatus status)
        {
            return await _dbSet
                .CountAsync(a => a.EmployeeId == employeeId && a.Status == status);
        }

        public async Task<IEnumerable<AttendanceLog>> GetTodayByDepartmentAsync(string departmentId)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            return await _dbSet
                .Include(a => a.Employee)
                .ThenInclude(e => e!.Department)
                .Where(a => a.Date == today &&
                           a.Employee != null &&
                           a.Employee.DepartmentId == departmentId)
                .ToListAsync();
        }

        public async Task<IEnumerable<AttendanceLog>> GetTodayByEmployeeAsync(string employeeId)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            return await _dbSet
                .Include(a => a.Employee)
                .Where(a => a.EmployeeId == employeeId && a.Date == today)
                .ToListAsync();
        }

        public async Task<IEnumerable<AttendanceLog>> GetByDateAndStatusAsync(DateOnly date, AttendanceStatus status)
        {
            return await _dbSet
                .Include(a => a.Employee)
                .ThenInclude(e => e!.Department)
                .Where(a => a.Date == date && a.Status == status)
                .ToListAsync();
        }

        public async Task<IEnumerable<AttendanceLog>> GetByDateAndStatusWithDepartmentAsync(
            DateOnly date,
            AttendanceStatus status,
            string? departmentId)
        {
            var query = _dbSet
                .Include(a => a.Employee)
                .ThenInclude(e => e!.Department)
                .Where(a => a.Date == date && a.Status == status);

            if (!string.IsNullOrEmpty(departmentId))
                query = query.Where(a => a.Employee != null && a.Employee.DepartmentId == departmentId);

            return await query.ToListAsync();
        }

        public async Task<Dictionary<string, DepartmentAttendanceSummary>> GetDepartmentAttendanceSummaryAsync(
            DateOnly? from,
            DateOnly? to)
        {
            var query = _dbSet
                .Include(a => a.Employee)
                .ThenInclude(e => e!.Department)
                .Where(a => a.Employee != null && a.Employee.DepartmentId != null);

            if (from.HasValue)
                query = query.Where(a => a.Date >= from.Value);
            if (to.HasValue)
                query = query.Where(a => a.Date <= to.Value);

            var result = await query
                .GroupBy(a => new { a.Employee!.DepartmentId, DeptName = a.Employee.Department!.Name })
                .Select(g => new DepartmentAttendanceSummary
                {
                    DepartmentId = g.Key.DepartmentId ?? string.Empty,
                    DepartmentName = g.Key.DeptName ?? string.Empty,
                    Total = g.Count(),
                    Present = g.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left),
                    Absent = g.Count(a => a.Status == AttendanceStatus.Absent),
                    Late = g.Count(a => a.Status == AttendanceStatus.Late),
                    AttendanceRate = g.Count() > 0 ?
                        (decimal)Math.Round((double)g.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Left) / g.Count() * 100, 2) : 0
                })
                .ToListAsync();

            return result.ToDictionary(x => x.DepartmentId);
        }

        public async Task<IEnumerable<AttendanceLog>> GetConsecutiveAbsencesAsync(DateOnly date, string? departmentId)
        {
            var yesterday = date.AddDays(-1);
            var dayBefore = date.AddDays(-2);

            var query = _dbSet
                .Include(a => a.Employee)
                .Where(a => (a.Date == yesterday || a.Date == dayBefore) && a.Status == AttendanceStatus.Absent);

            if (!string.IsNullOrEmpty(departmentId))
                query = query.Where(a => a.Employee != null && a.Employee.DepartmentId == departmentId);

            var employees = await query
                .GroupBy(a => a.EmployeeId)
                .Where(g => g.Count() >= 2)
                .Select(g => g.FirstOrDefault())
                .ToListAsync();

            return employees!;
        }
    }
}
