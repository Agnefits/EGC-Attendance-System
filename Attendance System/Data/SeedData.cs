using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Attendance_System.Models;
using Attendance_System.Enums;

namespace Attendance_System.Data
{
    public static class SeedData
    {
        public static async Task InitializeAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Ensure DB created / migrated
            await context.Database.MigrateAsync();

            // Seed Colleges
            if (!await context.Colleges.AnyAsync())
            {
                var colleges = new List<College>
                {
                    new College { Id = "FIT", Code = "FIT", Name = "كلية تكنولوجيا المعلومات", NameEn = "Faculty of Information Technology" },
                    new College { Id = "FE", Code = "FE", Name = "كلية الهندسة والتكنولوجيا", NameEn = "Faculty of Engineering" },
                    new College { Id = "FBS", Code = "FBS", Name = "كلية العلوم المالية والادارية", NameEn = "Faculty of Business Studies" }
                };
                await context.Colleges.AddRangeAsync(colleges);
                await context.SaveChangesAsync();
            }

            // Seed Departments
            if (!await context.Departments.AnyAsync())
            {
                var departments = new List<Department>
                {
                    new Department { Id = "CS", Code = "CS", Name = "علوم الحاسب", NameEn = "Computer Science", DeptType = DepartmentType.Academic, CollegeId = "FIT" },
                    new Department { Id = "IS", Code = "IS", Name = "نظم المعلومات", NameEn = "Information Systems", DeptType = DepartmentType.Academic, CollegeId = "FIT" },
                    new Department { Id = "HR", Code = "HR", Name = "الموارد البشرية", NameEn = "Human Resources", DeptType = DepartmentType.Administrative, ParentType = "university" },
                    new Department { Id = "FIN", Code = "FIN", Name = "الشئون المالية", NameEn = "Financial Affairs", DeptType = DepartmentType.Administrative, ParentType = "university" }
                };
                await context.Departments.AddRangeAsync(departments);
                await context.SaveChangesAsync();
            }

            // Seed Leave Types
            if (!await context.LeaveTypes.AnyAsync())
            {
                var leaveTypes = new List<LeaveType>
                {
                    new LeaveType { Id = "annual", Name = "إجازة سنوية", NameEn = "Annual Leave", MaxAnnualDays = 21, WomenOnly = false, AdminOnly = false, ColorHex = "#3b82f6" },
                    new LeaveType { Id = "sick", Name = "إجازة مرضية", NameEn = "Sick Leave", MaxAnnualDays = 30, WomenOnly = false, AdminOnly = false, ColorHex = "#ef4444" },
                    new LeaveType { Id = "urgent", Name = "إجازة عارضة", NameEn = "Urgent Leave", MaxAnnualDays = 7, WomenOnly = false, AdminOnly = false, ColorHex = "#f59e0b" },
                    new LeaveType { Id = "compensatory", Name = "إجازة اعتيادية/بدل راحة", NameEn = "Compensatory Leave", MaxAnnualDays = 12, WomenOnly = false, AdminOnly = false, ColorHex = "#8b5cf6" },
                    new LeaveType { Id = "grant", Name = "منحة إدارية", NameEn = "Management Grant", MaxAnnualDays = 0, WomenOnly = false, AdminOnly = true, ColorHex = "#10b981" },
                    new LeaveType { Id = "maternity", Name = "إجازة وضع", NameEn = "Maternity Leave", MaxAnnualDays = 120, WomenOnly = true, AdminOnly = false, ColorHex = "#ec4899" },
                    new LeaveType { Id = "unpaid", Name = "إجازة بدون مرتب", NameEn = "Unpaid Leave", MaxAnnualDays = 0, WomenOnly = false, AdminOnly = false, ColorHex = "#6b7280" }
                };
                await context.LeaveTypes.AddRangeAsync(leaveTypes);
                await context.SaveChangesAsync();
            }

            // Seed Default Work Schedule
            if (!await context.WorkSchedules.AnyAsync())
            {
                var defaultSchedule = new WorkSchedule
                {
                    Title = "الدوام الرسمي العام",
                    TimeMode = ScheduleTimeMode.Fixed,
                    CheckInTime = new TimeOnly(8, 0),
                    CheckOutTime = new TimeOnly(16, 0),
                    HoursPerDay = 8.00m,
                    DaysPerWeek = 5,
                    TargetScope = TargetScope.All
                };
                await context.WorkSchedules.AddAsync(defaultSchedule);
                await context.SaveChangesAsync();
            }

            // Seed Employees
            if (!await context.Employees.AnyAsync())
            {
                var employees = new List<Employee>
                {
                    new Employee { Id = "EMP001", Name = "أحمد المدير", NameEn = "Ahmed Admin", Email = "admin@aitu.edu", Phone = "01000000001", Gender = Gender.Male, RoleClassification = EmployeeRoleClassification.Academic, Type = EmployeeType.Academic, AcademicRank = "أستاذ دكتور", CollegeId = "FIT", DepartmentId = "CS", Status = "active" },
                    new Employee { Id = "EMP002", Name = "سارة الموارد البشرية", NameEn = "Sara HR", Email = "hr@aitu.edu", Phone = "01000000002", Gender = Gender.Female, RoleClassification = EmployeeRoleClassification.Administrative, Type = EmployeeType.Administrative, DepartmentId = "HR", Status = "active" },
                    new Employee { Id = "EMP003", Name = "محمود رئيس القسم", NameEn = "Mahmoud Head", Email = "head@aitu.edu", Phone = "01000000003", Gender = Gender.Male, RoleClassification = EmployeeRoleClassification.HeadDepartment, Type = EmployeeType.Academic, AcademicRank = "أستاذ مساعد", CollegeId = "FIT", DepartmentId = "CS", HeadType = "academic", Status = "active" },
                    new Employee { Id = "EMP004", Name = "عمرو الموظف", NameEn = "Amr Employee", Email = "employee@aitu.edu", Phone = "01000000004", Gender = Gender.Male, RoleClassification = EmployeeRoleClassification.Academic, Type = EmployeeType.Academic, AcademicRank = "مدرس", CollegeId = "FIT", DepartmentId = "CS", Status = "active" }
                };
                await context.Employees.AddRangeAsync(employees);
                await context.SaveChangesAsync();
            }

            // Seed Users
            if (!await context.Users.AnyAsync())
            {
                string defaultPasswordHash = HashPassword("password123");

                var users = new List<User>
                {
                    new User { Email = "admin@aitu.edu", PasswordHash = defaultPasswordHash, Role = UserRole.Admin, EmployeeId = "EMP001", IsActive = true },
                    new User { Email = "hr@aitu.edu", PasswordHash = defaultPasswordHash, Role = UserRole.Hr, EmployeeId = "EMP002", IsActive = true },
                    new User { Email = "head@aitu.edu", PasswordHash = defaultPasswordHash, Role = UserRole.Head, EmployeeId = "EMP003", IsActive = true },
                    new User { Email = "employee@aitu.edu", PasswordHash = defaultPasswordHash, Role = UserRole.Employee, EmployeeId = "EMP004", IsActive = true }
                };
                await context.Users.AddRangeAsync(users);
                await context.SaveChangesAsync();
            }
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }
    }
}
