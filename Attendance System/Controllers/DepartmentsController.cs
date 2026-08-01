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
    public class DepartmentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public DepartmentsController(AppDbContext context) { _context = context; }

        // GET /api/departments?collegeId=&deptType=  — any authenticated user
        [HttpGet]
        [AuthorizedRoles]
        public async Task<IActionResult> GetAll([FromQuery] string? collegeId, [FromQuery] DepartmentType? deptType)
        {
            var query = _context.Departments
                .Include(d => d.College)
                .Where(d => d.DeletedAt == null)
                .AsQueryable();

            if (!string.IsNullOrEmpty(collegeId)) query = query.Where(d => d.CollegeId == collegeId);
            if (deptType.HasValue) query = query.Where(d => d.DeptType == deptType.Value);

            var departments = await query
                .OrderBy(d => d.Name)
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.NameEn,
                    d.Code,
                    d.DeptType,
                    d.CollegeId,
                    CollegeName = d.College != null ? d.College.Name : null,
                    d.ParentId,
                    d.ParentType,
                    EmployeesCount = d.Employees.Count(e => e.DeletedAt == null),
                    d.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = departments });
        }

        // GET /api/departments/tree  — full org hierarchy for the Structure page
        [HttpGet("tree")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetTree()
        {
            var colleges = await _context.Colleges
                .Where(c => c.DeletedAt == null)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.NameEn,
                    c.Code,
                    Departments = c.Departments
                        .Where(d => d.DeletedAt == null && d.DeptType == DepartmentType.Academic)
                        .Select(d => new { d.Id, d.Name, d.NameEn, d.Code, d.DeptType })
                })
                .ToListAsync();

            var adminDepartments = await _context.Departments
                .Where(d => d.DeletedAt == null && d.DeptType == DepartmentType.Administrative)
                .Select(d => new { d.Id, d.Name, d.NameEn, d.Code, d.DeptType, d.ParentType })
                .ToListAsync();

            return Ok(new { success = true, data = new { colleges, adminDepartments } });
        }

        // GET /api/departments/{id}
        [HttpGet("{id}")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetById(string id)
        {
            var department = await _context.Departments
                .Include(d => d.College)
                .Where(d => d.Id == id && d.DeletedAt == null)
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.NameEn,
                    d.Code,
                    d.DeptType,
                    d.CollegeId,
                    CollegeName = d.College != null ? d.College.Name : null,
                    d.ParentId,
                    d.ParentType,
                    d.FunctionDescription,
                    d.CreatedAt,
                    d.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (department == null) return NotFound(new { success = false, message = "Department not found" });
            return Ok(new { success = true, data = department });
        }

        // POST /api/departments
        [HttpPost]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Create([FromBody] CreateDepartmentDto dto)
        {
            var codeExists = await _context.Departments.AnyAsync(d => d.Code == dto.Code && d.DeletedAt == null);
            if (codeExists) return BadRequest(new { success = false, message = "Department code already exists" });

            if (!string.IsNullOrEmpty(dto.CollegeId))
            {
                var collegeExists = await _context.Colleges.AnyAsync(c => c.Id == dto.CollegeId && c.DeletedAt == null);
                if (!collegeExists) return BadRequest(new { success = false, message = "Referenced college does not exist" });
            }

            var department = new Department
            {
                Id = Guid.NewGuid().ToString(),
                Name = dto.Name,
                NameEn = dto.NameEn,
                Code = dto.Code,
                DeptType = dto.DeptType,
                CollegeId = dto.CollegeId,
                ParentId = dto.ParentId,
                ParentType = dto.ParentType,
                FunctionDescription = dto.FunctionDescription,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Departments.Add(department);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Department created successfully", data = department });
        }

        // PUT /api/departments/{id}
        [HttpPut("{id}")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateDepartmentDto dto)
        {
            var department = await _context.Departments.FirstOrDefaultAsync(d => d.Id == id && d.DeletedAt == null);
            if (department == null) return NotFound(new { success = false, message = "Department not found" });

            if (!string.IsNullOrEmpty(dto.Code) && dto.Code != department.Code)
            {
                var codeExists = await _context.Departments.AnyAsync(d => d.Code == dto.Code && d.Id != id && d.DeletedAt == null);
                if (codeExists) return BadRequest(new { success = false, message = "Department code already exists" });
                department.Code = dto.Code;
            }

            department.Name = dto.Name ?? department.Name;
            department.NameEn = dto.NameEn ?? department.NameEn;
            department.DeptType = dto.DeptType ?? department.DeptType;
            department.CollegeId = dto.CollegeId ?? department.CollegeId;
            department.ParentId = dto.ParentId ?? department.ParentId;
            department.ParentType = dto.ParentType ?? department.ParentType;
            department.FunctionDescription = dto.FunctionDescription ?? department.FunctionDescription;
            department.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Department updated successfully", data = department });
        }

        // DELETE /api/departments/{id}  — soft delete
        [HttpDelete("{id}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Delete(string id)
        {
            var department = await _context.Departments.FirstOrDefaultAsync(d => d.Id == id && d.DeletedAt == null);
            if (department == null) return NotFound(new { success = false, message = "Department not found" });

            var hasEmployees = await _context.Employees.AnyAsync(e => e.DepartmentId == id && e.DeletedAt == null);
            if (hasEmployees)
                return BadRequest(new { success = false, message = "Cannot delete a department that still has active employees" });

            var hasChildren = await _context.Departments.AnyAsync(d => d.ParentId == id && d.DeletedAt == null);
            if (hasChildren)
                return BadRequest(new { success = false, message = "Cannot delete a department that has sub-departments" });

            department.DeletedAt = DateTime.UtcNow;
            department.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Department deleted successfully" });
        }
    }

    public class CreateDepartmentDto
    {
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DepartmentType DeptType { get; set; }
        public string? CollegeId { get; set; }
        public string? ParentId { get; set; }
        public string? ParentType { get; set; }
        public string? FunctionDescription { get; set; }
    }

    public class UpdateDepartmentDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Code { get; set; }
        public DepartmentType? DeptType { get; set; }
        public string? CollegeId { get; set; }
        public string? ParentId { get; set; }
        public string? ParentType { get; set; }
        public string? FunctionDescription { get; set; }
    }
}