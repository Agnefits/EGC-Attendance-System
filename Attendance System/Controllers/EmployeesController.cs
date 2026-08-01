using Microsoft.AspNetCore.Mvc;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.DTOs.Employees;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeesController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public EmployeesController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        [AuthorizedRoles]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? departmentId,
            [FromQuery] string? collegeId,
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var allEmployees = (await _unitOfWork.Employees.GetAllWithRelationsAsync()).AsQueryable();

            if (!string.IsNullOrEmpty(departmentId))
                allEmployees = allEmployees.Where(e => e.DepartmentId == departmentId);
            if (!string.IsNullOrEmpty(collegeId))
                allEmployees = allEmployees.Where(e => e.CollegeId == collegeId);
            if (!string.IsNullOrEmpty(status))
                allEmployees = allEmployees.Where(e => e.Status == status);
            if (!string.IsNullOrEmpty(search))
                allEmployees = allEmployees.Where(e => e.Name.Contains(search) || e.NameEn.Contains(search) || e.Email.Contains(search));

            var total = allEmployees.Count();

            var employees = allEmployees
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
                    DepartmentId = e.DepartmentId,
                    CollegeId = e.CollegeId,
                    Department = e.Department != null ? e.Department.Name : null,
                    College = e.College != null ? e.College.Name : null,
                    HasUserAccount = e.User != null,
                    CreatedAt = e.CreatedAt
                })
                .ToList();

            return Ok(new
            {
                success = true,
                data = employees,
                pagination = new
                {
                    page,
                    pageSize,
                    total,
                    totalPages = (int)Math.Ceiling((double)total / pageSize)
                }
            });
        }

        [HttpGet("{id}")]
        [AuthorizedRoles]
        public async Task<IActionResult> GetById(string id)
        {
            var employee = await _unitOfWork.Employees.GetEmployeeWithDepartmentAndCollegeAsync(id);

            if (employee == null)
                return NotFound(new { success = false, message = "Employee not found" });

            var result = new EmployeeDetailDto
            {
                Id = employee.Id,
                Name = employee.Name,
                NameEn = employee.NameEn,
                Email = employee.Email,
                Phone = employee.Phone,
                Gender = employee.Gender,
                RoleClassification = employee.RoleClassification,
                Type = employee.Type,
                AcademicRank = employee.AcademicRank,
                HeadType = employee.HeadType,
                Status = employee.Status,
                DepartmentId = employee.DepartmentId,
                CollegeId = employee.CollegeId,
                Department = employee.Department?.Name,
                College = employee.College?.Name,
                User = employee.User != null ? new EmployeeUserSummaryDto
                {
                    Id = employee.User.Id,
                    Email = employee.User.Email,
                    Role = employee.User.Role,
                    IsActive = employee.User.IsActive
                } : null
            };

            return Ok(new { success = true, data = result });
        }

        [HttpPost]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Create([FromBody] CreateEmployeeDto dto)
        {
            var existing = await _unitOfWork.Employees.GetByEmailAsync(dto.Email);
            if (existing != null)
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

            return Ok(new
            {
                success = true,
                message = "Employee added successfully",
                data = new { employee.Id, employee.Name, employee.Email }
            });
        }

        [HttpPut("{id}")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateEmployeeDto dto)
        {
            var employee = await _unitOfWork.Employees.GetEmployeeWithDepartmentAndCollegeAsync(id);
            if (employee == null)
                return NotFound(new { success = false, message = "Employee not found" });

            employee.Name = dto.Name ?? employee.Name;
            employee.NameEn = dto.NameEn ?? employee.NameEn;
            employee.Phone = dto.Phone ?? employee.Phone;
            employee.Gender = dto.Gender ?? employee.Gender;
            employee.RoleClassification = dto.RoleClassification ?? employee.RoleClassification;
            employee.Type = dto.Type ?? employee.Type;
            employee.AcademicRank = dto.AcademicRank;           // allow clearing to null
            employee.DepartmentId = dto.DepartmentId;           // allow clearing to null
            employee.CollegeId = dto.CollegeId;                 // allow clearing to null
            employee.HeadType = dto.HeadType;                   // allow clearing to null
            employee.Status = dto.Status ?? employee.Status;
            employee.UpdatedAt = DateTime.Now;

            _unitOfWork.Employees.Update(employee);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Employee updated successfully",
                data = new { employee.Id, employee.Name, employee.Status }
            });
        }

        [HttpDelete("{id}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Delete(string id)
        {
            var employee = await _unitOfWork.Employees.GetEmployeeWithUserAsync(id);
            if (employee == null)
                return NotFound(new { success = false, message = "Employee not found" });

            employee.DeletedAt = DateTime.UtcNow;
            employee.UpdatedAt = DateTime.UtcNow;
            employee.Status = "inactive";

            if (employee.User != null)
            {
                employee.User.DeletedAt = DateTime.UtcNow;
                employee.User.IsActive = false;
                employee.User.UpdatedAt = DateTime.UtcNow;
                _unitOfWork.Users.Update(employee.User);
            }

            _unitOfWork.Employees.Update(employee);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Employee deleted successfully" });
        }
    }
}