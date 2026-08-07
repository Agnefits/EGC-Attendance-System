using Attendance_System.Dtos;
using Attendance_System.DTOs.Auth;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Models;
using Attendance_System.Services;
using Attendance_System.UnitOfWork;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IJwtService _jwtService;
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _env;

        public AuthController(
            IUnitOfWork unitOfWork,
            IJwtService jwtService,
            IEmailService emailService,
            IWebHostEnvironment env)
        {
            _unitOfWork = unitOfWork;
            _jwtService = jwtService;
            _emailService = emailService;
            _env = env;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _unitOfWork.Users.Query()
                .Include(u => u.Employee).ThenInclude(e => e!.Department)
                .Include(u => u.Employee).ThenInclude(e => e!.College)
                .FirstOrDefaultAsync(u => u.Email == dto.Email && u.DeletedAt == null);

            if (user == null)
                return Unauthorized(new { success = false, message = "Invalid email or password" });

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized(new { success = false, message = "Invalid email or password" });

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
                    Role = user.Role.ToString(),
                    EmployeeId = user.Employee?.Id,
                    EmployeeName = user.Employee?.Name,
                    DepartmentId = user.Employee?.DepartmentId,
                    Department = user.Employee?.Department?.Name,
                    College = user.Employee?.College?.Name,
                    MustChangePassword = user.MustChangePassword
                }
            });
        }

        [HttpPost("register")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var userEmailExists = await _unitOfWork.Users.Query()
                .AnyAsync(u => u.Email == dto.Email && u.DeletedAt == null);
            if (userEmailExists)
                return BadRequest(new { success = false, message = "Email is already registered" });

            var employeeEmailExists = await _unitOfWork.Employees.Query()
                .AnyAsync(e => e.Email == dto.Email && e.DeletedAt == null);
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
                MustChangePassword = true,
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

        // Step 1 of "forgot password": generate a 6-digit OTP, email it, and store it
        // (10-minute expiry) against the account. Always returns the same generic
        // success message whether or not the email exists, so this endpoint can't be
        // used to enumerate registered accounts.
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            var genericResponse = new { success = true, message = "If this email is registered, a reset code has been sent." };

            if (string.IsNullOrWhiteSpace(dto.Email))
                return Ok(genericResponse);

            var user = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null || !user.IsActive || user.DeletedAt != null)
                return Ok(genericResponse);

            var otp = System.Security.Cryptography.RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            user.ResetOtp = otp;
            user.ResetOtpExpiresAt = DateTime.UtcNow.AddMinutes(10);
            user.UpdatedAt = DateTime.Now;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();

            _ = Task.Run(() => _emailService.SendEmailAsync(
                user.Email,
                "Password Reset Code",
                $"<p>Your password reset code is: <b style=\"font-size:20px\">{otp}</b></p><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>"));

            return Ok(genericResponse);
        }

        // Step 2 of "forgot password": verify the OTP and set a new password.
        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var user = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null || string.IsNullOrEmpty(user.ResetOtp) || user.ResetOtpExpiresAt == null)
                return BadRequest(new { success = false, message = "Invalid or expired code" });

            if (user.ResetOtpExpiresAt < DateTime.UtcNow)
            {
                user.ResetOtp = null;
                user.ResetOtpExpiresAt = null;
                _unitOfWork.Users.Update(user);
                await _unitOfWork.CompleteAsync();
                return BadRequest(new { success = false, message = "Code has expired, please request a new one" });
            }

            if (user.ResetOtp != dto.Otp)
                return BadRequest(new { success = false, message = "Invalid code" });

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return BadRequest(new { success = false, message = "New password must be at least 6 characters" });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.ResetOtp = null;
            user.ResetOtpExpiresAt = null;
            user.MustChangePassword = false;
            user.UpdatedAt = DateTime.Now;

            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Password reset successfully" });
        }

        // Self-service password change. Always acts on the CALLER's own account —
        // the target user id comes from the JWT (NameIdentifier claim), never from the
        // request body, so no one can change another account's password this way.
        [HttpPost("change-password")]
        [AuthorizedRoles]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { success = false, message = "Unauthorized" });

            var user = await _unitOfWork.Users.GetByIdAsync(userId.Value);
            if (user == null)
                return NotFound(new { success = false, message = "User not found" });

            if (!BCrypt.Net.BCrypt.Verify(dto.OldPassword, user.PasswordHash))
                return BadRequest(new { success = false, message = "Incorrect old password" });

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
                return BadRequest(new { success = false, message = "New password must be at least 6 characters" });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.MustChangePassword = false;
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
        [AuthorizedRoles]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var user = await _unitOfWork.Users.Query()
                .Include(u => u.Employee).ThenInclude(e => e!.Department)
                .Include(u => u.Employee).ThenInclude(e => e!.College)
                .Where(u => u.Id == userId && u.DeletedAt == null)
                .Select(u => new
                {
                    Id = u.Id,
                    Email = u.Email,
                    Role = u.Role,
                    IsActive = u.IsActive,
                    MustChangePassword = u.MustChangePassword,
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

        // Self-service profile edit. Only the caller's own Employee record can be touched,
        // and only a small, deliberately safe field set (name / display name / phone) —
        // never role, department, or anything else an ordinary user shouldn't be able to grant themselves.
        [HttpPut("me")]
        [AuthorizedRoles]
        public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileDto dto)
        {
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(employeeId))
                return BadRequest(new { success = false, message = "No employee linked to this account" });

            var employee = await _unitOfWork.Employees.GetByIdAsync(employeeId);
            if (employee == null)
                return NotFound(new { success = false, message = "Employee not found" });

            if (!string.IsNullOrWhiteSpace(dto.Name)) employee.Name = dto.Name.Trim();
            if (!string.IsNullOrWhiteSpace(dto.NameEn)) employee.NameEn = dto.NameEn.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Phone)) employee.Phone = dto.Phone.Trim();
            employee.UpdatedAt = DateTime.Now;

            _unitOfWork.Employees.Update(employee);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Profile updated successfully",
                data = new { employee.Id, employee.Name, employee.NameEn, employee.Phone }
            });
        }

        // Self-service avatar upload. Saves the file under wwwroot/uploads/avatars and
        // stores the relative URL on the caller's own Employee record.
        [HttpPost("me/photo")]
        [AuthorizedRoles]
        public async Task<IActionResult> UploadPhoto(IFormFile file)
        {
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(employeeId))
                return BadRequest(new { success = false, message = "No employee linked to this account" });

            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "No file uploaded" });

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(ext))
                return BadRequest(new { success = false, message = "Only JPG, PNG, or WEBP images are allowed" });

            const long maxSizeBytes = 3 * 1024 * 1024; // 3MB
            if (file.Length > maxSizeBytes)
                return BadRequest(new { success = false, message = "Image must be under 3MB" });

            var employee = await _unitOfWork.Employees.GetByIdAsync(employeeId);
            if (employee == null)
                return NotFound(new { success = false, message = "Employee not found" });

            var webRoot = string.IsNullOrEmpty(_env.WebRootPath)
                ? Path.Combine(_env.ContentRootPath, "wwwroot")
                : _env.WebRootPath;
            var uploadsDir = Path.Combine(webRoot, "uploads", "avatars");
            Directory.CreateDirectory(uploadsDir);

            // Remove the previous photo file, if any, so orphaned images don't pile up.
            if (!string.IsNullOrEmpty(employee.PhotoUrl))
            {
                var oldPath = Path.Combine(webRoot, employee.PhotoUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(oldPath))
                {
                    try { System.IO.File.Delete(oldPath); } catch { /* best-effort cleanup */ }
                }
            }

            var fileName = $"{employeeId}_{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            employee.PhotoUrl = $"/uploads/avatars/{fileName}";
            employee.UpdatedAt = DateTime.Now;

            _unitOfWork.Employees.Update(employee);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Photo updated successfully",
                data = new { photoUrl = employee.PhotoUrl }
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