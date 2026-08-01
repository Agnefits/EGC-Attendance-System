using Microsoft.AspNetCore.Mvc;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.DTOs.Departments;
using Attendance_System.DTOs.Colleges;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DepartmentsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public DepartmentsController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        [AuthorizedRoles]
        public async Task<IActionResult> GetAll([FromQuery] string? collegeId, [FromQuery] DepartmentType? deptType)
        {
            var departments = await _unitOfWork.Departments.GetActiveDepartmentsAsync();

            var query = departments.AsQueryable();
            if (!string.IsNullOrEmpty(collegeId))
                query = query.Where(d => d.CollegeId == collegeId);
            if (deptType.HasValue)
                query = query.Where(d => d.DeptType == deptType.Value);

            var result = query.Select(d => new DepartmentListItemDto
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
                EmployeesCount = d.Employees != null ? d.Employees.Count(e => e.DeletedAt == null) : 0,
                CreatedAt = d.CreatedAt
            }).ToList();

            return Ok(new { success = true, data = result });
        }

        [HttpGet("tree")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetTree()
        {
            var colleges = await _unitOfWork.Colleges.GetAllAsync();
            var departments = await _unitOfWork.Departments.GetActiveDepartmentsAsync();

            var collegeTree = colleges
                .Where(c => c.DeletedAt == null)
                .Select(c => new CollegeTreeDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    NameEn = c.NameEn,
                    Code = c.Code,
                    Departments = departments
                        .Where(d => d.CollegeId == c.Id && d.DeptType == DepartmentType.Academic)
                        .Select(d => new CollegeDepartmentDto
                        {
                            Id = d.Id,
                            Name = d.Name,
                            NameEn = d.NameEn,
                            Code = d.Code,
                            DeptType = d.DeptType
                        }).ToList()
                }).ToList();

            var adminDepartments = departments
                .Where(d => d.DeptType == DepartmentType.Administrative)
                .Select(d => new AdminDepartmentDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    NameEn = d.NameEn,
                    Code = d.Code,
                    DeptType = d.DeptType,
                    ParentType = d.ParentType
                }).ToList();

            return Ok(new { success = true, data = new { colleges = collegeTree, adminDepartments } });
        }

        [HttpGet("{id}")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetById(string id)
        {
            var department = await _unitOfWork.Departments.GetDepartmentWithCollegeAsync(id);

            if (department == null)
                return NotFound(new { success = false, message = "Department not found" });

            var result = new DepartmentDetailDto
            {
                Id = department.Id,
                Name = department.Name,
                NameEn = department.NameEn,
                Code = department.Code,
                DeptType = department.DeptType,
                CollegeId = department.CollegeId,
                CollegeName = department.College != null ? department.College.Name : null,
                ParentId = department.ParentId,
                ParentType = department.ParentType,
                FunctionDescription = department.FunctionDescription,
                CreatedAt = department.CreatedAt,
                UpdatedAt = department.UpdatedAt
            };

            return Ok(new { success = true, data = result });
        }

        [HttpPost]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Create([FromBody] CreateDepartmentDto dto)
        {
            var existing = await _unitOfWork.Departments.GetByCodeAsync(dto.Code);
            if (existing != null)
                return BadRequest(new { success = false, message = "Department code already exists" });

            if (!string.IsNullOrEmpty(dto.CollegeId))
            {
                var college = await _unitOfWork.Colleges.GetByIdAsync(dto.CollegeId);
                if (college == null || college.DeletedAt != null)
                    return BadRequest(new { success = false, message = "Referenced college does not exist" });
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

            return Ok(new
            {
                success = true,
                message = "Department created successfully",
                data = new { department.Id, department.Name, department.NameEn, department.Code, department.DeptType }
            });
        }

        [HttpPut("{id}")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateDepartmentDto dto)
        {
            var department = await _unitOfWork.Departments.GetDepartmentWithCollegeAsync(id);
            if (department == null)
                return NotFound(new { success = false, message = "Department not found" });

            if (!string.IsNullOrEmpty(dto.Code) && dto.Code != department.Code)
            {
                var existing = await _unitOfWork.Departments.GetByCodeAsync(dto.Code);
                if (existing != null && existing.Id != id)
                    return BadRequest(new { success = false, message = "Department code already exists" });
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

            return Ok(new
            {
                success = true,
                message = "Department updated successfully",
                data = new { department.Id, department.Name, department.NameEn, department.Code, department.DeptType }
            });
        }

        [HttpDelete("{id}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Delete(string id)
        {
            var department = await _unitOfWork.Departments.GetDepartmentWithCollegeAsync(id);
            if (department == null)
                return NotFound(new { success = false, message = "Department not found" });

            var hasEmployees = await _unitOfWork.Departments.HasActiveEmployeesAsync(id);
            if (hasEmployees)
                return BadRequest(new { success = false, message = "Cannot delete a department that still has active employees" });

            var hasChildren = await _unitOfWork.Departments.HasSubDepartmentsAsync(id);
            if (hasChildren)
                return BadRequest(new { success = false, message = "Cannot delete a department that has sub-departments" });

            department.DeletedAt = DateTime.UtcNow;
            department.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.Departments.Update(department);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Department deleted successfully" });
        }
    }
}