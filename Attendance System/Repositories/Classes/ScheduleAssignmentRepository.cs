using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;


namespace Attendance_System.Repositories.Classes
{
    public class ScheduleAssignmentRepository : GenericRepository<ScheduleAssignment>, IScheduleAssignmentRepository
    {
        public ScheduleAssignmentRepository(AppDbContext context) : base(context)
        {

        }

        public async Task<ScheduleAssignment?> GetByEmployeeIdWithScheduleAsync(string employeeId)
        {
            return await _dbSet
                .Include(sa => sa.Schedule)
                .FirstOrDefaultAsync(sa => sa.EmployeeId == employeeId);
        }

        public async Task<ScheduleAssignment?> GetByDepartmentIdWithScheduleAsync(string departmentId)
        {
            return await _dbSet
                .Include(sa => sa.Schedule)
                .FirstOrDefaultAsync(sa => sa.DepartmentId == departmentId);
        }

        public async Task<bool> AssignmentExistsForEmployeeAsync(string employeeId)
        {
            return await _dbSet.AnyAsync(sa => sa.EmployeeId == employeeId);
        }

        public async Task<bool> AssignmentExistsForDepartmentAsync(string departmentId)
        {
            return await _dbSet.AnyAsync(sa => sa.DepartmentId == departmentId);
        }
    }
}
