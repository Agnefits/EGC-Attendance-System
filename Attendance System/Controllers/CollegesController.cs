using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.DTOs.Colleges;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CollegesController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public CollegesController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        [AuthorizedRoles]
        public async Task<IActionResult> GetAll()
        {
            var colleges = await _unitOfWork.Colleges.Query()
                .Where(c => c.DeletedAt == null)
                .OrderBy(c => c.Name)
                .Select(c => new CollegeListItemDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    NameEn = c.NameEn,
                    Code = c.Code,
                    DepartmentsCount = c.Departments.Count(d => d.DeletedAt == null),
                    EmployeesCount = c.Employees.Count(e => e.DeletedAt == null),
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = colleges });
        }

        [HttpGet("{id}")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetById(string id)
        {
            var college = await _unitOfWork.Colleges.Query()
                .Where(c => c.Id == id && c.DeletedAt == null)
                .Select(c => new CollegeDetailDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    NameEn = c.NameEn,
                    Code = c.Code,
                    Departments = c.Departments
                        .Where(d => d.DeletedAt == null)
                        .Select(d => new CollegeDepartmentDto
                        {
                            Id = d.Id,
                            Name = d.Name,
                            NameEn = d.NameEn,
                            Code = d.Code,
                            DeptType = d.DeptType
                        }).ToList(),
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (college == null)
                return NotFound(new { success = false, message = "College not found" });

            return Ok(new { success = true, data = college });
        }

        [HttpPost]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Create([FromBody] CreateCollegeDto dto)
        {
            var codeExists = await _unitOfWork.Colleges.Query()
                .AnyAsync(c => c.Code == dto.Code && c.DeletedAt == null);
            if (codeExists)
                return BadRequest(new { success = false, message = "College code already exists" });

            var college = new College
            {
                Id = Guid.NewGuid().ToString(),
                Name = dto.Name,
                NameEn = dto.NameEn,
                Code = dto.Code,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Colleges.AddAsync(college);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "College created successfully",
                data = new { college.Id, college.Name, college.NameEn, college.Code }
            });
        }

        [HttpPut("{id}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateCollegeDto dto)
        {
            var college = await _unitOfWork.Colleges.Query()
                .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null);
            if (college == null)
                return NotFound(new { success = false, message = "College not found" });

            if (!string.IsNullOrEmpty(dto.Code) && dto.Code != college.Code)
            {
                var codeExists = await _unitOfWork.Colleges.Query()
                    .AnyAsync(c => c.Code == dto.Code && c.Id != id && c.DeletedAt == null);
                if (codeExists)
                    return BadRequest(new { success = false, message = "College code already exists" });
                college.Code = dto.Code;
            }

            college.Name = dto.Name ?? college.Name;
            college.NameEn = dto.NameEn ?? college.NameEn;
            college.UpdatedAt = DateTime.UtcNow;

            _unitOfWork.Colleges.Update(college);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "College updated successfully",
                data = new { college.Id, college.Name, college.NameEn, college.Code }
            });
        }

        [HttpDelete("{id}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Delete(string id)
        {
            var college = await _unitOfWork.Colleges.Query()
                .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null);
            if (college == null)
                return NotFound(new { success = false, message = "College not found" });

            var hasActiveDepts = await _unitOfWork.Departments.Query()
                .AnyAsync(d => d.CollegeId == id && d.DeletedAt == null);
            if (hasActiveDepts)
                return BadRequest(new { success = false, message = "Cannot delete a college that still has active departments" });

            college.DeletedAt = DateTime.UtcNow;
            college.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Colleges.Update(college);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "College deleted successfully" });
        }
    }
}