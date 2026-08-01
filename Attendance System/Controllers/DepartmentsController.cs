using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DepartmentsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        public DepartmentsController(IUnitOfWork unitOfWork) { _unitOfWork = unitOfWork; }

        [HttpGet]
        [AuthorizedRoles]
        public async Task<IActionResult> GetAll([FromQuery] string? collegeId, [FromQuery] DepartmentType? deptType)
        {
            var query = _unitOfWork.Departments.Query()
                .Include(d => d.College)
                .Where(d => d.DeletedAt == null)
                .AsQueryable();

            if (!string.IsNullOrEmpty(collegeId)) query = query.Where(d => d.CollegeId == collegeId);
            if (deptType.HasValue) query = query.Where(d => d.DeptType == deptType.Value);

            var departments = await query
                .OrderBy(d => d.Name)
                .Select(d => new DepartmentListItemDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    NameEn = d.NameEn,
                    Code = d.Code,
                    DeptType = d.DeptType,
                    CollegeId = d.CollegeId,
                    CollegeName = d.College != null ? d.College.Name : null,
                    ParentId = d.ParentId,
                    ParentType = d.ParentType,
                    EmployeesCount = d.Employees.Count(e => e.DeletedAt == null),
                    CreatedAt = d.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, data = departments });
        }

        [HttpGet("tree")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetTree()
        {
            var colleges = await _unitOfWork.Colleges.Query()
                .Where(c => c.DeletedAt == null)
                .Select(c => new CollegeTreeDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    NameEn = c.NameEn,
                    Code = c.Code,
                    Departments = c.Departments
                        .Where(d => d.DeletedAt == null && d.DeptType == DepartmentType.Academic)
                        .Select(d => new CollegeDepartmentDto { Id = d.Id, Name = d.Name, NameEn = d.NameEn, Code = d.Code, DeptType = d.DeptType })
                        .ToList()
                })
                .ToListAsync();

            var adminDepartments = await _unitOfWork.Departments.Query()
                .Where(d => d.DeletedAt == null && d.DeptType == DepartmentType.Administrative)
                .Select(d => new AdminDepartmentDto { Id = d.Id, Name = d.Name, NameEn = d.NameEn, Code = d.Code, DeptType = d.DeptType, ParentType = d.ParentType })
                .ToListAsync();

            return Ok(new { success = true, data = new { colleges, adminDepartments } });
        }

        [HttpGet("{id}")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetById(string id)
        {
            var department = await _unitOfWork.Departments.Query()
                .Include(d => d.College)
                .Where(d => d.Id == id && d.DeletedAt == null)
                .Select(d => new DepartmentDetailDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    NameEn = d.NameEn,
                    Code = d.Code,
                    DeptType = d.DeptType,
                    CollegeId = d.CollegeId,
                    CollegeName = d.College != null ? d.College.Name : null,
                    ParentId = d.ParentId,
                    ParentType = d.ParentType,
                    FunctionDescription = d.FunctionDescription,
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (department == null) return NotFound(new { success = false, message = "Department not found" });
            return Ok(new { success = true, data = department });
        }

        [HttpPost]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Create([FromBody] CreateDepartmentDto dto)
        {
            var codeExists = await _unitOfWork.Departments.Query().AnyAsync(d => d.Code == dto.Code && d.DeletedAt == null);
            if (codeExists) return BadRequest(new { success = false, message = "Department code already exists" });

            if (!string.IsNullOrEmpty(dto.CollegeId))
            {
                var collegeExists = await _unitOfWork.Colleges.Query().AnyAsync(c => c.Id == dto.CollegeId && c.DeletedAt == null);
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

            await _unitOfWork.Departments.AddAsync(department);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Department created successfully", data = new { department.Id, department.Name, department.NameEn, department.Code, department.DeptType } });
        }

        [HttpPut("{id}")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateDepartmentDto dto)
        {
            var department = await _unitOfWork.Departments.Query().FirstOrDefaultAsync(d => d.Id == id && d.DeletedAt == null);
            if (department == null) return NotFound(new { success = false, message = "Department not found" });

            if (!string.IsNullOrEmpty(dto.Code) && dto.Code != department.Code)
            {
                var codeExists = await _unitOfWork.Departments.Query().AnyAsync(d => d.Code == dto.Code && d.Id != id && d.DeletedAt == null);
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

            _unitOfWork.Departments.Update(department);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Department updated successfully", data = new { department.Id, department.Name, department.NameEn, department.Code, department.DeptType } });
        }

        [HttpDelete("{id}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Delete(string id)
        {
            var department = await _unitOfWork.Departments.Query().FirstOrDefaultAsync(d => d.Id == id && d.DeletedAt == null);
            if (department == null) return NotFound(new { success = false, message = "Department not found" });

            var hasEmployees = await _unitOfWork.Employees.Query().AnyAsync(e => e.DepartmentId == id && e.DeletedAt == null);
            if (hasEmployees)
                return BadRequest(new { success = false, message = "Cannot delete a department that still has active employees" });

            var hasChildren = await _unitOfWork.Departments.Query().AnyAsync(d => d.ParentId == id && d.DeletedAt == null);
            if (hasChildren)
                return BadRequest(new { success = false, message = "Cannot delete a department that has sub-departments" });

            department.DeletedAt = DateTime.UtcNow;
            department.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Departments.Update(department);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Department deleted successfully" });
        }
    }

    // ── Response DTOs ──

    public class DepartmentListItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DepartmentType DeptType { get; set; }
        public string? CollegeId { get; set; }
        public string? CollegeName { get; set; }
        public string? ParentId { get; set; }
        public string? ParentType { get; set; }
        public int EmployeesCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class DepartmentDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DepartmentType DeptType { get; set; }
        public string? CollegeId { get; set; }
        public string? CollegeName { get; set; }
        public string? ParentId { get; set; }
        public string? ParentType { get; set; }
        public string? FunctionDescription { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CollegeTreeDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        // Reuses CollegeDepartmentDto defined in CollegesController.cs (same namespace) - not redefined here.
        public List<CollegeDepartmentDto> Departments { get; set; } = new();
    }

    public class AdminDepartmentDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DepartmentType DeptType { get; set; }
        public string? ParentType { get; set; }
    }

    // ── Request DTOs (unchanged) ──

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
