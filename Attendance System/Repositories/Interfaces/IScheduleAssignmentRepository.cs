using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface IScheduleAssignmentRepository : IGenericRepository<ScheduleAssignment>
    {
        Task<ScheduleAssignment?> GetByEmployeeIdWithScheduleAsync(string employeeId);
        Task<ScheduleAssignment?> GetByDepartmentIdWithScheduleAsync(string departmentId);
        Task<bool> AssignmentExistsForEmployeeAsync(string employeeId);
        Task<bool> AssignmentExistsForDepartmentAsync(string departmentId);
    }
}
