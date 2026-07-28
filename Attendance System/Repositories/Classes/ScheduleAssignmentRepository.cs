using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.Repositories.Classes
{
    public class ScheduleAssignmentRepository : GenericRepository<ScheduleAssignment>, IScheduleAssignmentRepository
    {
        public ScheduleAssignmentRepository(AppDbContext context) : base(context)
        {
        }
    }
}
