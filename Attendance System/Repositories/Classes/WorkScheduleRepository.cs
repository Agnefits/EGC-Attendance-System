using Attendance_System.Data;
using Attendance_System.Models;
using Attendance_System.Repositories.Interfaces;

namespace Attendance_System.Repositories.Classes
{
    public class WorkScheduleRepository : GenericRepository<WorkSchedule>, IWorkScheduleRepository
    {
        public WorkScheduleRepository(AppDbContext context) : base(context)
        {
        }
    }
}
