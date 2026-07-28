using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface IExamScheduleRepository : IGenericRepository<ExamSchedule>
    {
        Task<IEnumerable<ExamSchedule>> GetByEmployeeIdAsync(string employeeId);
    }
}
