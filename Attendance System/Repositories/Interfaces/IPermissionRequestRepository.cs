using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface IPermissionRequestRepository : IGenericRepository<PermissionRequest>
    {
        Task<IEnumerable<PermissionRequest>> GetByEmployeeIdAsync(string employeeId);
        Task<IEnumerable<PermissionRequest>> GetPendingByDepartmentIdAsync(string departmentId);

        Task<IEnumerable<PermissionRequest>> GetByEmployeeIdWithDetailsAsync(string employeeId);
        Task<IEnumerable<PermissionRequest>> GetPendingWithDetailsAsync();
        Task<IEnumerable<PermissionRequest>> GetPendingByDepartmentWithDetailsAsync(string departmentId);
        Task<PermissionRequest?> GetPermissionRequestWithDetailsAsync(string id);
        Task<int> GetPendingCountAsync();
        Task<int> GetPendingCountByDepartmentAsync(string departmentId);
        Task<int> GetUsedMinutesByEmployeeAndDateRangeAsync(string employeeId, DateOnly startDate, DateOnly endDate);
        Task<int> GetUsedMinutesByEmployeeAndDateRangeExcludingNursingAsync(string employeeId, DateOnly startDate, DateOnly endDate);
    }
}
