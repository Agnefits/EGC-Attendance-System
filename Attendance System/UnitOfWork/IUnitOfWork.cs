using System;
using System.Threading.Tasks;
using Attendance_System.Repositories.Interfaces;
using Attendance_System.Models;

namespace Attendance_System.UnitOfWork
{
    public interface IUnitOfWork : IDisposable
    {
        ICollegeRepository Colleges { get; }
        IDepartmentRepository Departments { get; }
        IUserRepository Users { get; }
        IEmployeeRepository Employees { get; }
        IAttendanceLogRepository AttendanceLogs { get; }
        ILeaveTypeRepository LeaveTypes { get; }
        ILeaveRequestRepository LeaveRequests { get; }
        IPermissionRequestRepository PermissionRequests { get; }
        IWorkScheduleRepository WorkSchedules { get; }
        IScheduleAssignmentRepository ScheduleAssignments { get; }
        IExamScheduleRepository ExamSchedules { get; }
        IGenericRepository<SystemSetting> SystemSettings { get; }

        Task<int> CompleteAsync();
    }
}
