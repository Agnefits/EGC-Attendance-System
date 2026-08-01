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
    public class EmployeesController : ControllerBase
    {
        private readonly AppDbContext _context;
        public EmployeesController(AppDbContext context) { _context = context; }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? departmentId, [FromQuery] string? collegeId,
            [FromQuery] string? status, [FromQuery] string? search,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var query = _context.Employees.Include(e => e.Department).Include(e => e.College).Include(e => e.User).AsQueryable();

            if (!string.IsNullOrEmpty(departmentId)) query = query.Where(e => e.DepartmentId == departmentId);
            if (!string.IsNullOrEmpty(collegeId)) query = query.Where(e => e.CollegeId == collegeId);
            if (!string.IsNullOrEmpty(status)) query = query.Where(e => e.Status == status);
            if (!string.IsNullOrEmpty(search))
                query = query.Where(e => e.Name.Contains(search) || e.NameEn.Contains(search) || e.Email.Contains(search));

            var total = await query.CountAsync();
            var employees = await query.OrderBy(e => e.Name).Skip((page - 1) * pageSize).Take(pageSize)
                .Select(e => new
                {
                    e.Id,
                    e.Name,
                    e.NameEn,
                    e.Email,
                    e.Phone,
                    e.Gender,
                    e.RoleClassification,
                    e.Type,
                    e.AcademicRank,
                    e.HeadType,
                    e.Status,
                    Department = e.Department != null ? e.Department.Name : null,
                    College = e.College != null ? e.College.Name : null,
                    HasUserAccount = e.User != null,
                    e.CreatedAt
                }).ToListAsync();

            return Ok(new { success = true, data = employees, pagination = new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize) } });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var employee = await _context.Employees.Include(e => e.Department).Include(e => e.College).Include(e => e.User).FirstOrDefaultAsync(e => e.Id == id);
            if (employee == null) return NotFound(new { success = false, message = "Employee not found" });

            return Ok(new
            {
                success = true,
                data = new
                {
                    employee.Id,
                    employee.Name,
                    employee.NameEn,
                    employee.Email,
                    employee.Phone,
                    employee.Gender,
                    employee.RoleClassification,
                    employee.Type,
                    employee.AcademicRank,
                    employee.HeadType,
                    employee.Status,
                    Department = employee.Department?.Name,
                    College = employee.College?.Name,
                    User = employee.User != null ? new { employee.User.Id, employee.User.Email, employee.User.Role, employee.User.IsActive } : null
                }
            });
        }

        [HttpPost]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Create([FromBody] CreateEmployeeDto dto)
        {
            var emailExists = await _context.Employees.AnyAsync(e => e.Email == dto.Email);
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

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Employee added successfully", data = employee });
        }

        [HttpPut("{id}")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateEmployeeDto dto)
        {
            var employee = await _context.Employees.FindAsync(id);
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

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Employee updated successfully", data = employee });
        }

        [HttpDelete("{id}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Delete(string id)
        {
            var employee = await _context.Employees.Include(e => e.User).FirstOrDefaultAsync(e => e.Id == id);
            if (employee == null) return NotFound(new { success = false, message = "Employee not found" });

            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Employee deleted successfully" });
        }
    }

    public class CreateEmployeeDto
    {
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public Gender Gender { get; set; }
        public EmployeeRoleClassification? RoleClassification { get; set; }
        public EmployeeType? Type { get; set; }
        public string? AcademicRank { get; set; }
        public string? DepartmentId { get; set; }
        public string? CollegeId { get; set; }
        public string? HeadType { get; set; }
    }

    public class UpdateEmployeeDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Phone { get; set; }
        public Gender? Gender { get; set; }
        public EmployeeRoleClassification? RoleClassification { get; set; }
        public EmployeeType? Type { get; set; }
        public string? AcademicRank { get; set; }
        public string? DepartmentId { get; set; }
        public string? CollegeId { get; set; }
        public string? HeadType { get; set; }
        public string? Status { get; set; }
    }
}