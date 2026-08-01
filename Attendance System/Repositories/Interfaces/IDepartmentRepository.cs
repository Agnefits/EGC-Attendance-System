using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface IDepartmentRepository : IGenericRepository<Department>
    {
        Task<Department?> GetByCodeAsync(string code);
        Task<IEnumerable<Department>> GetByCollegeIdAsync(string collegeId);

        Task<Department?> GetDepartmentWithCollegeAsync(string departmentId);
        Task<IEnumerable<Department>> GetActiveDepartmentsAsync();
        Task<IEnumerable<Department>> GetActiveDepartmentsByCollegeAsync(string collegeId);
        Task<bool> HasActiveEmployeesAsync(string departmentId);
        Task<bool> HasSubDepartmentsAsync(string departmentId);
    }
}
