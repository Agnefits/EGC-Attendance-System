using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.Dtos;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeesController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        public EmployeesController(IUnitOfWork unitOfWork) { _unitOfWork = unitOfWork; }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? departmentId, [FromQuery] string? collegeId,
            [FromQuery] string? status, [FromQuery] string? search,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var query = _unitOfWork.Employees.Query()
                .Include(e => e.Department)
                .Include(e => e.College)
                .Include(e => e.User)
                .AsQueryable();

            // A department Head only manages their own department's staff, and never
            // Admin/Hr accounts — regardless of department — since those are system-level roles.
            if (User.FindFirst(ClaimTypes.Role)?.Value == "Head")
            {
                var headDeptId = await GetCurrentDepartmentIdAsync();
                query = query.Where(e => e.DepartmentId == headDeptId
                    && (e.User == null || (e.User.Role != UserRole.Admin && e.User.Role != UserRole.Hr)));
            }
            else
            {
                if (!string.IsNullOrEmpty(departmentId)) query = query.Where(e => e.DepartmentId == departmentId);
            }

            if (!string.IsNullOrEmpty(collegeId)) query = query.Where(e => e.CollegeId == collegeId);
            if (!string.IsNullOrEmpty(status)) query = query.Where(e => e.Status == status);
            if (!string.IsNullOrEmpty(search))
                query = query.Where(e => e.Name.Contains(search) || e.NameEn.Contains(search) || e.Email.Contains(search));

            var total = await query.CountAsync();

            var employees = await query
                .OrderBy(e => e.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new EmployeeListItemDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    NameEn = e.NameEn,
                    Email = e.Email,
                    Phone = e.Phone,
                    Gender = e.Gender,
                    RoleClassification = e.RoleClassification,
                    Type = e.Type,
                    AcademicRank = e.AcademicRank,
                    HeadType = e.HeadType,
                    Status = e.Status,
                    Department = e.Department != null ? e.Department.Name : null,
                    College = e.College != null ? e.College.Name : null,
                    HasUserAccount = e.User != null,
                    CreatedAt = e.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = employees,
                pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) }
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var employee = await _unitOfWork.Employees.Query()
                .Include(e => e.Department)
                .Include(e => e.College)
                .Include(e => e.User)
                .Where(e => e.Id == id)
                .Select(e => new EmployeeDetailDto
                {
                    Id = e.Id,
                    Name = e.Name,
                    NameEn = e.NameEn,
                    Email = e.Email,
                    Phone = e.Phone,
                    Gender = e.Gender,
                    RoleClassification = e.RoleClassification,
                    Type = e.Type,
                    AcademicRank = e.AcademicRank,
                    HeadType = e.HeadType,
                    Status = e.Status,
                    DepartmentId = e.DepartmentId,
                    Department = e.Department != null ? e.Department.Name : null,
                    College = e.College != null ? e.College.Name : null,
                    User = e.User != null ? new EmployeeUserSummaryDto
                    {
                        Id = e.User.Id,
                        Email = e.User.Email,
                        Role = e.User.Role,
                        IsActive = e.User.IsActive
                    } : null
                })
                .FirstOrDefaultAsync();

            if (employee != null && User.FindFirst(ClaimTypes.Role)?.Value == "Head")
            {
                var headDeptId = await GetCurrentDepartmentIdAsync();
                var isPrivileged = employee.User != null && (employee.User.Role == UserRole.Admin || employee.User.Role == UserRole.Hr);
                if (employee.DepartmentId != headDeptId || isPrivileged)
                    return StatusCode(403, new { success = false, message = "You can only view employees in your own department" });
            }

            if (employee == null) return NotFound(new { success = false, message = "Employee not found" });

            return Ok(new { success = true, data = employee });
        }

        [HttpPost]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Create([FromBody] CreateEmployeeDto dto)
        {
            var emailExists = await _unitOfWork.Employees.Query().AnyAsync(e => e.Email == dto.Email);
            if (emailExists) return BadRequest(new { success = false, message = "Employee email already exists" });

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

            return Ok(new
            {
                success = true,
                message = "Employee added successfully",
                data = ToDetailDto(employee)
            });
        }

        [HttpPut("{id}")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateEmployeeDto dto)
        {
            var employee = await _unitOfWork.Employees.GetByIdAsync(id);
            if (employee == null) return NotFound(new { success = false, message = "Employee not found" });

            employee.Name = dto.Name ?? employee.Name;
            employee.NameEn = dto.NameEn ?? employee.NameEn;
            employee.Phone = dto.Phone ?? employee.Phone;
            employee.Gender = dto.Gender ?? employee.Gender;
            employee.RoleClassification = dto.RoleClassification ?? employee.RoleClassification;
            employee.Type = dto.Type ?? employee.Type;
            employee.AcademicRank = dto.AcademicRank ?? employee.AcademicRank;
            employee.DepartmentId = dto.DepartmentId ?? employee.DepartmentId;
            employee.CollegeId = dto.CollegeId ?? employee.CollegeId;
            employee.HeadType = dto.HeadType ?? employee.HeadType;
            employee.Status = dto.Status ?? employee.Status;
            employee.UpdatedAt = DateTime.Now;

            _unitOfWork.Employees.Update(employee);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Employee updated successfully",
                data = ToDetailDto(employee)
            });
        }

        [HttpDelete("{id}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Delete(string id)
        {
            var employee = await _unitOfWork.Employees.Query()
                .Include(e => e.User)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (employee == null) return NotFound(new { success = false, message = "Employee not found" });

            _unitOfWork.Employees.Delete(employee);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Employee deleted successfully" });
        }

        private static EmployeeDetailDto ToDetailDto(Employee e) => new EmployeeDetailDto
        {
            Id = e.Id,
            Name = e.Name,
            NameEn = e.NameEn,
            Email = e.Email,
            Phone = e.Phone,
            Gender = e.Gender,
            RoleClassification = e.RoleClassification,
            Type = e.Type,
            AcademicRank = e.AcademicRank,
            HeadType = e.HeadType,
            Status = e.Status,
            DepartmentId = null,
            Department = null,
            College = null,
            User = null
        };

        private async Task<string?> GetCurrentDepartmentIdAsync()
        {
            var employeeId = User.FindFirst("EmployeeId")?.Value;
            if (string.IsNullOrEmpty(employeeId)) return null;
            var employee = await _unitOfWork.Employees.GetByIdAsync(employeeId);
            return employee?.DepartmentId;
        }
    }
}
