using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface IScheduleSessionRepository : IGenericRepository<ScheduleSession>
    {
        Task<IEnumerable<ScheduleSession>> GetByEmployeeIdAsync(string employeeId);
    }
}