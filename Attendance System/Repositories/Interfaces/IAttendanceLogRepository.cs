using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface IAttendanceLogRepository : IGenericRepository<AttendanceLog>
    {
        Task<AttendanceLog?> GetByEmployeeAndDateAsync(string employeeId, DateOnly date);
        Task<IEnumerable<AttendanceLog>> GetByEmployeeIdAsync(string employeeId);
        Task<IEnumerable<AttendanceLog>> GetByDateRangeAsync(DateOnly startDate, DateOnly endDate);
    }
}
