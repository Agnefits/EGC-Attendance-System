using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;

namespace Attendance_System.Repositories.Interfaces
{
    public interface IAttendanceLogRepository : IGenericRepository<AttendanceLog>
    {
        Task<AttendanceLog?> GetByEmployeeAndDateAsync(string employeeId, DateOnly date);
        Task<IEnumerable<AttendanceLog>> GetByEmployeeIdAsync(string employeeId);
        Task<IEnumerable<AttendanceLog>> GetByDateRangeAsync(DateOnly startDate, DateOnly endDate);

        Task<IEnumerable<AttendanceLog>> GetByEmployeeIdWithDetailsAsync(string employeeId);
        Task<IEnumerable<AttendanceLog>> GetByDateRangeWithDetailsAsync(DateOnly startDate, DateOnly endDate);
        Task<AttendanceLog?> GetByIdWithEmployeeAsync(string id);
        Task<bool> ExistsForEmployeeOnDateAsync(string employeeId, DateOnly date);
        Task<int> GetTotalCountAsync();
        Task<int> GetCountByStatusAsync(AttendanceStatus status);
        Task<int> GetCountByStatusAndDateAsync(AttendanceStatus status, DateOnly date);

        // ≈÷«›«  ÃœÌœ… ··›· —… ›Ì ﬁ«⁄œ… «·»Ì«‰« 
        Task<IEnumerable<AttendanceLog>> GetFilteredAsync(
            DateOnly? from,
            DateOnly? to,
            string? employeeId,
            string? departmentId,
            AttendanceStatus? status,
            int page,
            int pageSize);

        Task<int> GetFilteredCountAsync(
            DateOnly? from,
            DateOnly? to,
            string? employeeId,
            string? departmentId,
            AttendanceStatus? status);

        Task<IEnumerable<AttendanceLog>> GetByDateRangeWithFiltersAsync(
            DateOnly? from,
            DateOnly? to,
            string? departmentId);

        Task<Dictionary<AttendanceStatus, int>> GetStatusCountsAsync(DateOnly? from, DateOnly? to, string? departmentId);

        Task<IEnumerable<AttendanceLog>> GetByDepartmentWithDateRangeAsync(
            string departmentId,
            DateOnly? from,
            DateOnly? to);

        Task<IEnumerable<AttendanceLog>> GetByEmployeeWithDateRangeAsync(
            string employeeId,
            DateOnly? from,
            DateOnly? to);

        Task<int> GetCountByEmployeeAndDateRangeAsync(string employeeId, DateOnly startDate, DateOnly endDate);

        Task<int> GetCountByEmployeeAndStatusAsync(string employeeId, AttendanceStatus status);

        Task<IEnumerable<AttendanceLog>> GetTodayByDepartmentAsync(string departmentId);

        Task<IEnumerable<AttendanceLog>> GetTodayByEmployeeAsync(string employeeId);

        Task<IEnumerable<AttendanceLog>> GetByDateAndStatusAsync(DateOnly date, AttendanceStatus status);

        Task<IEnumerable<AttendanceLog>> GetByDateAndStatusWithDepartmentAsync(DateOnly date, AttendanceStatus status, string? departmentId);

        Task<Dictionary<string, DepartmentAttendanceSummary>> GetDepartmentAttendanceSummaryAsync(DateOnly? from, DateOnly? to);

        Task<IEnumerable<AttendanceLog>> GetConsecutiveAbsencesAsync(DateOnly date, string? departmentId);
    }

    public class DepartmentAttendanceSummary
    {
        public string DepartmentId { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public int Total { get; set; }
        public int Present { get; set; }
        public int Absent { get; set; }
        public int Late { get; set; }
        public decimal AttendanceRate { get; set; }
    }
}
