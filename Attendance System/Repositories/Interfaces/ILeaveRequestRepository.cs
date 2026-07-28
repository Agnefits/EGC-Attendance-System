using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface ILeaveRequestRepository : IGenericRepository<LeaveRequest>
    {
        Task<IEnumerable<LeaveRequest>> GetByEmployeeIdAsync(string employeeId);
        Task<IEnumerable<LeaveRequest>> GetPendingByDepartmentIdAsync(string departmentId);
    }
}
