using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Services;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.Dtos;
using Microsoft.AspNetCore.Authorization;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IJwtService _jwtService;
        private readonly IEmailService _emailService;

        public AuthController(
            IUnitOfWork unitOfWork,
            IJwtService jwtService,
            IEmailService emailService)
        {
            _unitOfWork = unitOfWork;
            _jwtService = jwtService;
            _emailService = emailService;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _unitOfWork.Users.Query()
                .Include(u => u.Employee).ThenInclude(e => e!.Department)
                .Include(u => u.Employee).ThenInclude(e => e!.College)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
                return Unauthorized(new { success = false, message = "Invalid email" });

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized(new { success = false, message = "Invalid password" });

            if (!user.IsActive || user.DeletedAt != null)
                return Unauthorized(new { success = false, message = "Account is inactive, please contact administration" });

            user.LastLoginAt = DateTime.Now;
            user.UpdatedAt = DateTime.Now;
            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();

            var token = _jwtService.GenerateToken(user);

            return Ok(new
            {
                success = true,
                message = "Login successful",
                data = new LoginResponseDto
                {
                    Token = token,
                    UserId = user.Id,
                    Email = user.Email,
                    Role = user.Role.ToString(),
                    EmployeeId = user.Employee?.Id,
                    EmployeeName = user.Employee?.Name,
                    DepartmentId = user.Employee?.DepartmentId,
                    Department = user.Employee?.Department?.Name,
                    College = user.Employee?.College?.Name
                }
            });
        }

        [HttpPost("register")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var userEmailExists = await _unitOfWork.Users.ExistsByEmailAsync(dto.Email);
            if (userEmailExists)
                return BadRequest(new { success = false, message = "Email is already registered" });

            var employeeEmailExists = await _unitOfWork.Employees.Query().AnyAsync(e => e.Email == dto.Email);
            if (employeeEmailExists)
                return BadRequest(new { success = false, message = "Employee email already exists" });

            var employee = new Employee
            {
                Id = Guid.NewGuid().ToString(),
                Name = dto.Name,
                NameEn = dto.NameEn,
                Email = dto.Email,
                Phone = dto.Phone,
                Gender = dto.Gender,
                RoleClassification = dto.RoleClassification ?? EmployeeRoleClassification.Academic,
                Type = dto.Type ?? EmployeeType.Academic,
                AcademicRank = dto.AcademicRank,
                DepartmentId = dto.DepartmentId,
                CollegeId = dto.CollegeId,
                HeadType = dto.HeadType,
                Status = "active",
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            await _unitOfWork.Employees.AddAsync(employee);
            await _unitOfWork.CompleteAsync();

            var user = new User
            {
                EmployeeId = employee.Id,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role ?? UserRole.Employee,
                IsActive = true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            await _unitOfWork.Users.AddAsync(user);
            await _unitOfWork.CompleteAsync();

            _ = Task.Run(() => _emailService.SendEmailAsync(user.Email, "Welcome", $"<p>Welcome, {employee.Name}!</p>"));

            return Ok(new
            {
                success = true,
                message = "Registration successful",
                data = new RegisterResponseDto { UserId = user.Id, EmployeeId = employee.Id }
            });
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(dto.UserId);
            if (user == null)
                return NotFound(new { success = false, message = "User not found" });

            if (!BCrypt.Net.BCrypt.Verify(dto.OldPassword, user.PasswordHash))
                return BadRequest(new { success = false, message = "Incorrect old password" });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.Now;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Password changed successfully" });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            return Ok(new { success = true, message = "Logout successful" });
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var user = await _unitOfWork.Users.Query()
                .Include(u => u.Employee).ThenInclude(e => e!.Department)
                .Include(u => u.Employee).ThenInclude(e => e!.College)
                .Where(u => u.Id == userId)
                .Select(u => new CurrentUserDto
                {
                    Id = u.Id,
                    Email = u.Email,
                    Role = u.Role,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    LastLoginAt = u.LastLoginAt,
                    Employee = u.Employee != null ? new CurrentUserEmployeeDto
                    {
                        Id = u.Employee.Id,
                        Name = u.Employee.Name,
                        NameEn = u.Employee.NameEn,
                        Phone = u.Employee.Phone,
                        Gender = u.Employee.Gender,
                        DepartmentId = u.Employee.DepartmentId,
                        Department = u.Employee.Department != null ? u.Employee.Department.Name : null,
                        College = u.Employee.College != null ? u.Employee.College.Name : null,
                        Type = u.Employee.Type,
                        RoleClassification = u.Employee.RoleClassification
                    } : null
                })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound();

            return Ok(new { success = true, data = user });
        }

        [HttpGet("validate-token")]
        public IActionResult ValidateToken()
        {
            return Ok(new { success = true, message = "Token is valid" });
        }

        private long? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return userIdClaim != null && long.TryParse(userIdClaim, out var id) ? id : (long?)null;
        }
    }
}
