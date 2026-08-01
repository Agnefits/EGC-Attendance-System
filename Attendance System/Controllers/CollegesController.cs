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
    public class CollegesController : ControllerBase
    {
        private readonly AppDbContext _context;
        public CollegesController(AppDbContext context) { _context = context; }

        // GET /api/colleges  — any authenticated user (needed for dropdowns)
        [HttpGet]
        [AuthorizedRoles]
        public async Task<IActionResult> GetAll()
        {
            var colleges = await _context.Colleges
                .Where(c => c.DeletedAt == null)
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.NameEn,
                    c.Code,
                    DepartmentsCount = c.Departments.Count(d => d.DeletedAt == null),
                    EmployeesCount = c.Employees.Count(e => e.DeletedAt == null),
                    c.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = colleges });
        }

        // GET /api/colleges/{id}
        [HttpGet("{id}")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetById(string id)
        {
            var college = await _context.Colleges
                .Where(c => c.Id == id && c.DeletedAt == null)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.NameEn,
                    c.Code,
                    Departments = c.Departments
                        .Where(d => d.DeletedAt == null)
                        .Select(d => new { d.Id, d.Name, d.NameEn, d.Code, d.DeptType }),
                    c.CreatedAt,
                    c.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (college == null) return NotFound(new { success = false, message = "College not found" });
            return Ok(new { success = true, data = college });
        }

        // POST /api/colleges
        [HttpPost]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Create([FromBody] CreateCollegeDto dto)
        {
            var codeExists = await _context.Colleges.AnyAsync(c => c.Code == dto.Code && c.DeletedAt == null);
            if (codeExists) return BadRequest(new { success = false, message = "College code already exists" });

            var college = new College
            {
                Id = Guid.NewGuid().ToString(),
                Name = dto.Name,
                NameEn = dto.NameEn,
                Code = dto.Code,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Colleges.Add(college);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "College created successfully", data = college });
        }

        // PUT /api/colleges/{id}
        [HttpPut("{id}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateCollegeDto dto)
        {
            var college = await _context.Colleges.FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null);
            if (college == null) return NotFound(new { success = false, message = "College not found" });

            if (!string.IsNullOrEmpty(dto.Code) && dto.Code != college.Code)
            {
                var codeExists = await _context.Colleges.AnyAsync(c => c.Code == dto.Code && c.Id != id && c.DeletedAt == null);
                if (codeExists) return BadRequest(new { success = false, message = "College code already exists" });
                college.Code = dto.Code;
            }

            college.Name = dto.Name ?? college.Name;
            college.NameEn = dto.NameEn ?? college.NameEn;
            college.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "College updated successfully", data = college });
        }

        // DELETE /api/colleges/{id}  — soft delete
        [HttpDelete("{id}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Delete(string id)
        {
            var college = await _context.Colleges.FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null);
            if (college == null) return NotFound(new { success = false, message = "College not found" });

            var hasActiveDepts = await _context.Departments.AnyAsync(d => d.CollegeId == id && d.DeletedAt == null);
            if (hasActiveDepts)
                return BadRequest(new { success = false, message = "Cannot delete a college that still has active departments" });

            college.DeletedAt = DateTime.UtcNow;
            college.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "College deleted successfully" });
        }
    }

    public class CreateCollegeDto
    {
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
    }

    public class UpdateCollegeDto
    {
        public string? Name { get; set; }
        public string? NameEn { get; set; }
        public string? Code { get; set; }
    }
}