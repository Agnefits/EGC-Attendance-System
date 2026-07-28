using System;
using System.Threading.Tasks;
using Attendance_System.Repositories.Interfaces;

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

        Task<int> CompleteAsync();
    }
}
