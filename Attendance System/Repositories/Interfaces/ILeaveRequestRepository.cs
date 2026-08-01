using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface ILeaveRequestRepository : IGenericRepository<LeaveRequest>
    {
        Task<IEnumerable<LeaveRequest>> GetByEmployeeIdAsync(string employeeId);
        Task<IEnumerable<LeaveRequest>> GetPendingByDepartmentIdAsync(string departmentId);

        Task<IEnumerable<LeaveRequest>> GetByEmployeeIdWithDetailsAsync(string employeeId);
        Task<IEnumerable<LeaveRequest>> GetPendingWithDetailsAsync();
        Task<IEnumerable<LeaveRequest>> GetPendingByDepartmentWithDetailsAsync(string departmentId);
        Task<LeaveRequest?> GetLeaveRequestWithDetailsAsync(string id);
        Task<int> GetPendingCountAsync();
        Task<int> GetPendingCountByDepartmentAsync(string departmentId);
        Task<int> GetApprovedCountByEmployeeAndTypeAsync(string employeeId, string leaveTypeId, DateOnly fromDate, DateOnly toDate);
        Task<int> GetApprovedLeaveDaysByEmployeeAndTypeAsync(string employeeId, string leaveTypeId, DateOnly fromDate, DateOnly toDate);
        Task<int> GetApprovedLeavesOnDateAsync(DateOnly date);
    }
}
