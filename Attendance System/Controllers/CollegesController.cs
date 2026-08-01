using Microsoft.AspNetCore.Mvc;
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
            var colleges = await _unitOfWork.Colleges.GetAllAsync();

            var result = colleges
                .Where(c => c.DeletedAt == null)
                .OrderBy(c => c.Name)
                .Select(c => new CollegeListItemDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    NameEn = c.NameEn,
                    Code = c.Code,
                    DepartmentsCount = c.Departments?.Count(d => d.DeletedAt == null) ?? 0,
                    EmployeesCount = c.Employees?.Count(e => e.DeletedAt == null) ?? 0,
                    CreatedAt = c.CreatedAt
                });

            return Ok(new { success = true, data = result });
        }

        [HttpGet("{id}")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetById(string id)
        {
            var college = await _unitOfWork.Colleges.GetCollegeWithDepartmentsAsync(id);

            if (college == null)
                return NotFound(new { success = false, message = "College not found" });

            var result = new CollegeDetailDto
            {
                Id = college.Id,
                Name = college.Name,
                NameEn = college.NameEn,
                Code = college.Code,
                Departments = college.Departments?
                    .Where(d => d.DeletedAt == null)
                    .Select(d => new CollegeDepartmentDto
                    {
                        Id = d.Id,
                        Name = d.Name,
                        NameEn = d.NameEn,
                        Code = d.Code,
                        DeptType = d.DeptType
                    }).ToList() ?? new List<CollegeDepartmentDto>(),
                CreatedAt = college.CreatedAt,
                UpdatedAt = college.UpdatedAt
            };

            return Ok(new { success = true, data = result });
        }

        [HttpPost]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Create([FromBody] CreateCollegeDto dto)
        {
            var existing = await _unitOfWork.Colleges.GetByCodeAsync(dto.Code);
            if (existing != null)
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
            var college = await _unitOfWork.Colleges.GetByIdAsync(id);
            if (college == null || college.DeletedAt != null)
                return NotFound(new { success = false, message = "College not found" });

            if (!string.IsNullOrEmpty(dto.Code) && dto.Code != college.Code)
            {
                var existing = await _unitOfWork.Colleges.GetByCodeAsync(dto.Code);
                if (existing != null && existing.Id != id)
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
            var college = await _unitOfWork.Colleges.GetByIdAsync(id);
            if (college == null || college.DeletedAt != null)
                return NotFound(new { success = false, message = "College not found" });

            var hasActiveDepts = await _unitOfWork.Colleges.HasActiveDepartmentsAsync(id);
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