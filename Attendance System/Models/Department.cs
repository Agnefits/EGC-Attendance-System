using System;
using System.Collections.Generic;
using Attendance_System.Enums;

namespace Attendance_System.Models
{
    public class Department
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DepartmentType DeptType { get; set; } = DepartmentType.Academic;
        public string? CollegeId { get; set; }
        public string? ParentType { get; set; }
        public string? ParentId { get; set; }
        public string? FunctionDescription { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DeletedAt { get; set; }

        public College? College { get; set; }
        public Department? ParentDepartment { get; set; }
        public ICollection<Department> SubDepartments { get; set; } = new List<Department>();
        public ICollection<Employee> Employees { get; set; } = new List<Employee>();
        public ICollection<ScheduleAssignment> ScheduleAssignments { get; set; } = new List<ScheduleAssignment>();
    }
}
