using System;
using System.Threading.Tasks;
using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Classes;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.UnitOfWork
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly AppDbContext _context;
        private bool _disposed = false;

        public ICollegeRepository Colleges { get; private set; }
        public IDepartmentRepository Departments { get; private set; }
        public IUserRepository Users { get; private set; }
        public IEmployeeRepository Employees { get; private set; }
        public IAttendanceLogRepository AttendanceLogs { get; private set; }
        public ILeaveTypeRepository LeaveTypes { get; private set; }
        public ILeaveRequestRepository LeaveRequests { get; private set; }
        public IPermissionRequestRepository PermissionRequests { get; private set; }
        public IWorkScheduleRepository WorkSchedules { get; private set; }
        public IScheduleAssignmentRepository ScheduleAssignments { get; private set; }
        public IExamScheduleRepository ExamSchedules { get; private set; }
        public IGenericRepository<SystemSetting> SystemSettings { get; private set; }

        public UnitOfWork(AppDbContext context)
        {
            _context = context;
            Colleges = new CollegeRepository(_context);
            Departments = new DepartmentRepository(_context);
            Users = new UserRepository(_context);
            Employees = new EmployeeRepository(_context);
            AttendanceLogs = new AttendanceLogRepository(_context);
            LeaveTypes = new LeaveTypeRepository(_context);
            LeaveRequests = new LeaveRequestRepository(_context);
            PermissionRequests = new PermissionRequestRepository(_context);
            WorkSchedules = new WorkScheduleRepository(_context);
            ScheduleAssignments = new ScheduleAssignmentRepository(_context);
            ExamSchedules = new ExamScheduleRepository(_context);
            SystemSettings = new GenericRepository<SystemSetting>(_context);

        }

        public async Task<int> CompleteAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (!_disposed)
            {
                if (disposing)
                {
                    _context.Dispose();
                }
                _disposed = true;
            }
        }
    }
}
