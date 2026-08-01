using Microsoft.AspNetCore.Mvc;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.DTOs.Users;

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
            var allUsers = await _unitOfWork.Users.GetAllAsync();

            var query = allUsers
                .Where(u => u.DeletedAt == null)
                .AsQueryable();

            if (role.HasValue) query = query.Where(u => u.Role == role.Value);
            if (isActive.HasValue) query = query.Where(u => u.IsActive == isActive.Value);
            if (!string.IsNullOrEmpty(departmentId))
                query = query.Where(u => u.Employee != null && u.Employee.DepartmentId == departmentId);
            if (!string.IsNullOrEmpty(collegeId))
                query = query.Where(u => u.Employee != null && u.Employee.CollegeId == collegeId);
            if (!string.IsNullOrEmpty(search))
                query = query.Where(u => u.Email.Contains(search) || (u.Employee != null && u.Employee.Name.Contains(search)));

            var total = query.Count();

            var users = query
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
                .ToList();

            return Ok(new
            {
                success = true,
                data = users,
                pagination = new
                {
                    page,
                    pageSize,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / pageSize)
                }
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(long id)
        {
            var user = await _unitOfWork.Users.GetUserWithEmployeeAsync(id);

            if (user == null)
                return NotFound(new { success = false, message = "User not found" });

            var result = new UserDetailDto
            {
                Id = user.Id,
                Email = user.Email,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt,
                Employee = user.Employee != null ? new UserEmployeeDetailDto
                {
                    Id = user.Employee.Id,
                    Name = user.Employee.Name,
                    NameEn = user.Employee.NameEn,
                    Phone = user.Employee.Phone,
                    Gender = user.Employee.Gender,
                    Department = user.Employee.Department?.Name,
                    College = user.Employee.College?.Name,
                    Type = user.Employee.Type,
                    RoleClassification = user.Employee.RoleClassification
                } : null
            };

            return Ok(new { success = true, data = result });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateUserDto dto)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null || user.DeletedAt != null)
                return NotFound(new { success = false, message = "User not found" });

            if (!string.IsNullOrEmpty(dto.Email) && dto.Email != user.Email)
            {
                var emailExists = await _unitOfWork.Users.ExistsByEmailAsync(dto.Email);
                if (emailExists)
                    return BadRequest(new { success = false, message = "Email is already taken" });
                user.Email = dto.Email;
            }

            user.Role = dto.Role ?? user.Role;
            user.IsActive = dto.IsActive ?? user.IsActive;
            user.UpdatedAt = DateTime.Now;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "User updated successfully",
                data = new { user.Id, user.Email, user.Role, user.IsActive }
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(long id)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null || user.DeletedAt != null)
                return NotFound(new { success = false, message = "User not found" });

            user.DeletedAt = DateTime.UtcNow;
            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "User deleted successfully" });
        }

        [HttpPut("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(long id)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null || user.DeletedAt != null)
                return NotFound(new { success = false, message = "User not found" });

            user.IsActive = !user.IsActive;
            user.UpdatedAt = DateTime.Now;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = $"User {(user.IsActive ? "activated" : "deactivated")} successfully",
                data = new { user.Id, user.IsActive }
            });
        }
    }
}