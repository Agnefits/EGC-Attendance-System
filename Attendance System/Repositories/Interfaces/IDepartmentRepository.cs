using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface IDepartmentRepository : IGenericRepository<Department>
    {
        Task<Department?> GetByCodeAsync(string code);
        Task<IEnumerable<Department>> GetByCollegeIdAsync(string collegeId);
    }
}
