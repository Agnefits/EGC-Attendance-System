using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Services;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.DTOs.Auth;

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
            var user = await _unitOfWork.Users.GetUserWithEmployeeByEmailAsync(dto.Email);

            if (user == null)
                return Unauthorized(new { success = false, message = "Invalid email" });

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized(new { success = false, message = "Invalid password" });

            if (!user.IsActive)
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
                data = new AuthResponseDto
                {
                    Token = token,
                    UserId = user.Id,
                    Email = user.Email,
                    Role = user.Role,
                    EmployeeId = user.Employee?.Id,
                    EmployeeName = user.Employee?.Name,
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

            var employeeEmailExists = await _unitOfWork.Employees.GetByEmailAsync(dto.Email);
            if (employeeEmailExists != null)
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
                data = new { UserId = user.Id, EmployeeId = employee.Id }
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

            var user = await _unitOfWork.Users.GetUserWithEmployeeAsync(userId.Value);

            if (user == null)
                return NotFound();

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

        [HttpGet("validate-token")]
        public IActionResult ValidateToken()
        {
            return Ok(new { success = true, message = "Token is valid" });
        }

        private long? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return userIdClaim != null && long.TryParse(userIdClaim, out var id) ? id : null;
        }
    }
}