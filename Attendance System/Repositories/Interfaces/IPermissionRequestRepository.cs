using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface IPermissionRequestRepository : IGenericRepository<PermissionRequest>
    {
        Task<IEnumerable<PermissionRequest>> GetByEmployeeIdAsync(string employeeId);
        Task<IEnumerable<PermissionRequest>> GetPendingByDepartmentIdAsync(string departmentId);
    }
}
