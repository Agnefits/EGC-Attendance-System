using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Data;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] UserRole? role,
            [FromQuery] bool? isActive,
            [FromQuery] string? departmentId,
            [FromQuery] string? collegeId,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var query = _context.Users
                    .Include(u => u.Employee)
                    .ThenInclude(e => e!.Department)
                    .Include(u => u.Employee)
                    .ThenInclude(e => e!.College)
                    .AsQueryable();

                if (role.HasValue) query = query.Where(u => u.Role == role.Value);
                if (isActive.HasValue) query = query.Where(u => u.IsActive == isActive.Value);
                if (!string.IsNullOrEmpty(departmentId)) query = query.Where(u => u.Employee != null && u.Employee.DepartmentId == departmentId);
                if (!string.IsNullOrEmpty(collegeId)) query = query.Where(u => u.Employee != null && u.Employee.CollegeId == collegeId);
                if (!string.IsNullOrEmpty(search))
                    query = query.Where(u => u.Email.Contains(search) || (u.Employee != null && u.Employee.Name.Contains(search)));

                var total = await query.CountAsync();
                var users = await query
                    .OrderBy(u => u.Email)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(u => new
                    {
                        u.Id,
                        u.Email,
                        u.Role,
                        u.IsActive,
                        u.CreatedAt,
                        u.LastLoginAt,
                        Employee = u.Employee != null ? new
                        {
                            u.Employee.Id,
                            u.Employee.Name,
                            u.Employee.NameEn,
                            Department = u.Employee.Department != null ? u.Employee.Department.Name : null,
                            College = u.Employee.College != null ? u.Employee.College.Name : null,
                            u.Employee.Type,
                            u.Employee.RoleClassification
                        } : null
                    })
                    .ToListAsync();

                return Ok(new { success = true, data = users, pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) } });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(long id)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Employee).ThenInclude(e => e!.Department)
                    .Include(u => u.Employee).ThenInclude(e => e!.College)
                    .FirstOrDefaultAsync(u => u.Id == id);

                if (user == null) return NotFound(new { success = false, message = "User not found" });

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        user.Id,
                        user.Email,
                        user.Role,
                        user.IsActive,
                        user.CreatedAt,
                        user.LastLoginAt,
                        Employee = user.Employee != null ? new
                        {
                            user.Employee.Id,
                            user.Employee.Name,
                            user.Employee.NameEn,
                            user.Employee.Phone,
                            user.Employee.Gender,
                            Department = user.Employee.Department?.Name,
                            College = user.Employee.College?.Name,
                            user.Employee.Type,
                            user.Employee.RoleClassification
                        } : null
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateUserDto dto)
        {
            try
            {
                var user = await _context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Id == id);
                if (user == null) return NotFound(new { success = false, message = "User not found" });

                if (!string.IsNullOrEmpty(dto.Email) && dto.Email != user.Email)
                {
                    var emailExists = await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id);
                    if (emailExists) return BadRequest(new { success = false, message = "Email is already taken" });
                    user.Email = dto.Email;
                }

                user.Role = dto.Role ?? user.Role;
                user.IsActive = dto.IsActive ?? user.IsActive;
                user.UpdatedAt = DateTime.Now;

                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "User updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(long id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null) return NotFound(new { success = false, message = "User not found" });
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
                return Ok(new { success = true, message = "User deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }

        [HttpPut("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(long id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null) return NotFound(new { success = false, message = "User not found" });

                user.IsActive = !user.IsActive;
                user.UpdatedAt = DateTime.Now;
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = $"User {(user.IsActive ? "activated" : "deactivated")} successfully", data = new { user.Id, user.IsActive } });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "An error occurred", error = ex.Message });
            }
        }
    }

    public class UpdateUserDto
    {
        public string? Email { get; set; }
        public UserRole? Role { get; set; }
        public bool? IsActive { get; set; }
    }
}
