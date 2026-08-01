using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
    public class UsersController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public UsersController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
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
            var query = _unitOfWork.Users.Query()
                .Include(u => u.Employee).ThenInclude(e => e!.Department)
                .Include(u => u.Employee).ThenInclude(e => e!.College)
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
                .Select(u => new UserListItemDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    Role = u.Role,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    LastLoginAt = u.LastLoginAt,
                    Employee = u.Employee != null ? new UserEmployeeSummaryDto
                    {
                        Id = u.Employee.Id,
                        Name = u.Employee.Name,
                        NameEn = u.Employee.NameEn,
                        Department = u.Employee.Department != null ? u.Employee.Department.Name : null,
                        College = u.Employee.College != null ? u.Employee.College.Name : null,
                        Type = u.Employee.Type,
                        RoleClassification = u.Employee.RoleClassification
                    } : null
                })
                .ToListAsync();

            return Ok(new { success = true, data = users, pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) } });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(long id)
        {
            var user = await _unitOfWork.Users.Query()
                .Include(u => u.Employee).ThenInclude(e => e!.Department)
                .Include(u => u.Employee).ThenInclude(e => e!.College)
                .Where(u => u.Id == id)
                .Select(u => new UserDetailDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    Role = u.Role,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    LastLoginAt = u.LastLoginAt,
                    Employee = u.Employee != null ? new UserEmployeeDetailDto
                    {
                        Id = u.Employee.Id,
                        Name = u.Employee.Name,
                        NameEn = u.Employee.NameEn,
                        Phone = u.Employee.Phone,
                        Gender = u.Employee.Gender,
                        Department = u.Employee.Department != null ? u.Employee.Department.Name : null,
                        College = u.Employee.College != null ? u.Employee.College.Name : null,
                        Type = u.Employee.Type,
                        RoleClassification = u.Employee.RoleClassification
                    } : null
                })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound(new { success = false, message = "User not found" });

            return Ok(new { success = true, data = user });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateUserDto dto)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null) return NotFound(new { success = false, message = "User not found" });

            if (!string.IsNullOrEmpty(dto.Email) && dto.Email != user.Email)
            {
                var emailExists = await _unitOfWork.Users.ExistsByEmailAsync(dto.Email);
                if (emailExists) return BadRequest(new { success = false, message = "Email is already taken" });
                user.Email = dto.Email;
            }

            user.Role = dto.Role ?? user.Role;
            user.IsActive = dto.IsActive ?? user.IsActive;
            user.UpdatedAt = DateTime.Now;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "User updated successfully" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(long id)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null) return NotFound(new { success = false, message = "User not found" });

            _unitOfWork.Users.Delete(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "User deleted successfully" });
        }

        [HttpPut("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(long id)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null) return NotFound(new { success = false, message = "User not found" });

            user.IsActive = !user.IsActive;
            user.UpdatedAt = DateTime.Now;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = $"User {(user.IsActive ? "activated" : "deactivated")} successfully", data = new { user.Id, user.IsActive } });
        }
    }

    // ── Response DTOs ──

    public class UserListItemDto
    {
        public long Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public UserEmployeeSummaryDto? Employee { get; set; }
    }

    public class UserDetailDto
    {
        public long Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        public UserEmployeeDetailDto? Employee { get; set; }
    }

    public class UserEmployeeSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? College { get; set; }
        public EmployeeType Type { get; set; }
        public EmployeeRoleClassification RoleClassification { get; set; }
    }

    public class UserEmployeeDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public Gender Gender { get; set; }
        public string? Department { get; set; }
        public string? College { get; set; }
        public EmployeeType Type { get; set; }
        public EmployeeRoleClassification RoleClassification { get; set; }
    }

    // ── Request DTO (unchanged) ──

    public class UpdateUserDto
    {
        public string? Email { get; set; }
        public UserRole? Role { get; set; }
        public bool? IsActive { get; set; }
    }
}
