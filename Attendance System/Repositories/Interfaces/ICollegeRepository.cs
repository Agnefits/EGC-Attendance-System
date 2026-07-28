using System.Threading.Tasks;
using Attendance_System.Models;

namespace Attendance_System.Repositories.Interfaces
{
    public interface ICollegeRepository : IGenericRepository<College>
    {
        Task<College?> GetByCodeAsync(string code);
    }
}
