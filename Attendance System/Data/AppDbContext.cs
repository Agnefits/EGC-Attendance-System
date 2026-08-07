using Microsoft.EntityFrameworkCore;
using Attendance_System.Models;
using Attendance_System.Enums;

namespace Attendance_System.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<College> Colleges => Set<College>();
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<User> Users => Set<User>();
        public DbSet<Employee> Employees => Set<Employee>();
        public DbSet<AttendanceLog> AttendanceLogs => Set<AttendanceLog>();
        public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
        public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
        public DbSet<PermissionRequest> PermissionRequests => Set<PermissionRequest>();
        public DbSet<WorkSchedule> WorkSchedules => Set<WorkSchedule>();
        public DbSet<ScheduleAssignment> ScheduleAssignments => Set<ScheduleAssignment>();
        public DbSet<ScheduleSession> ScheduleSessions => Set<ScheduleSession>();
        public DbSet<ExamSchedule> ExamSchedules => Set<ExamSchedule>();
        public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // College Configuration
            modelBuilder.Entity<College>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Id).HasMaxLength(36);
                entity.Property(c => c.Name).HasMaxLength(150).IsRequired();
                entity.Property(c => c.NameEn).HasMaxLength(150).IsRequired();
                entity.Property(c => c.Code).HasMaxLength(20).IsRequired();
                entity.HasIndex(c => c.Code).IsUnique();
            });

            // Department Configuration
            modelBuilder.Entity<Department>(entity =>
            {
                entity.HasKey(d => d.Id);
                entity.Property(d => d.Id).HasMaxLength(36);
                entity.Property(d => d.Name).HasMaxLength(150).IsRequired();
                entity.Property(d => d.NameEn).HasMaxLength(150).IsRequired();
                entity.Property(d => d.Code).HasMaxLength(20).IsRequired();
                entity.HasIndex(d => d.Code).IsUnique();
                entity.Property(d => d.DeptType).HasConversion<string>().HasMaxLength(20);

                entity.HasOne(d => d.College)
                      .WithMany(c => c.Departments)
                      .HasForeignKey(d => d.CollegeId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(d => d.ParentDepartment)
                      .WithMany(d => d.SubDepartments)
                      .HasForeignKey(d => d.ParentId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // User Configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(u => u.Id);
                entity.Property(u => u.Email).HasMaxLength(150).IsRequired();
                // Filtered unique index: only enforced among non-deleted users,
                // so an email freed up by a soft-deleted user can be reused.
                entity.HasIndex(u => u.Email)
                      .IsUnique()
                      .HasFilter("[DeletedAt] IS NULL");
                entity.Property(u => u.PasswordHash).HasMaxLength(255).IsRequired();
                entity.Property(u => u.Role).HasConversion<string>().HasMaxLength(30);

                entity.HasOne(u => u.Employee)
                      .WithOne(e => e.User)
                      .HasForeignKey<User>(u => u.EmployeeId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Employee Configuration
            modelBuilder.Entity<Employee>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id).HasMaxLength(36);
                entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
                entity.Property(e => e.NameEn).HasMaxLength(150).IsRequired();
                entity.Property(e => e.Email).HasMaxLength(150).IsRequired();
                // Filtered unique index: only enforced among non-deleted employees,
                // so an email freed up by a soft-deleted employee can be reused.
                entity.HasIndex(e => e.Email)
                      .IsUnique()
                      .HasFilter("[DeletedAt] IS NULL");
                entity.Property(e => e.Phone).HasMaxLength(30).IsRequired();
                entity.Property(e => e.Gender).HasConversion<string>().HasMaxLength(10);
                entity.Property(e => e.RoleClassification).HasConversion<string>().HasMaxLength(30);
                entity.Property(e => e.Type).HasConversion<string>().HasMaxLength(20);
                entity.Property(e => e.AcademicRank).HasMaxLength(50);
                entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("active");

                entity.HasOne(e => e.Department)
                      .WithMany(d => d.Employees)
                      .HasForeignKey(e => e.DepartmentId)
                      .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.College)
                      .WithMany(c => c.Employees)
                      .HasForeignKey(e => e.CollegeId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // AttendanceLog Configuration
            modelBuilder.Entity<AttendanceLog>(entity =>
            {
                entity.HasKey(a => a.Id);
                entity.Property(a => a.Id).HasMaxLength(50);
                entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
                entity.Property(a => a.ResolutionMethod).HasConversion<string>().HasMaxLength(20);
                entity.Property(a => a.Latitude).HasPrecision(10, 8);
                entity.Property(a => a.Longitude).HasPrecision(11, 8);
                entity.Property(a => a.GpsAccuracy).HasPrecision(8, 2);
                entity.Property(a => a.DistanceFromCampus).HasPrecision(8, 2);

                entity.HasIndex(a => new { a.EmployeeId, a.Date }).IsUnique();

                entity.HasOne(a => a.Employee)
                      .WithMany(e => e.AttendanceLogs)
                      .HasForeignKey(a => a.EmployeeId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // LeaveType Configuration
            modelBuilder.Entity<LeaveType>(entity =>
            {
                entity.HasKey(lt => lt.Id);
                entity.Property(lt => lt.Id).HasMaxLength(30);
                entity.Property(lt => lt.Name).HasMaxLength(100).IsRequired();
                entity.Property(lt => lt.NameEn).HasMaxLength(100).IsRequired();
                entity.Property(lt => lt.ColorHex).HasMaxLength(10);
            });

            // LeaveRequest Configuration
            modelBuilder.Entity<LeaveRequest>(entity =>
            {
                entity.HasKey(lr => lr.Id);
                entity.Property(lr => lr.Id).HasMaxLength(50);
                entity.Property(lr => lr.Status).HasConversion<string>().HasMaxLength(20);
                entity.Property(lr => lr.MaternityMode).HasConversion<string>().HasMaxLength(20);

                entity.HasOne(lr => lr.Employee)
                      .WithMany(e => e.LeaveRequests)
                      .HasForeignKey(lr => lr.EmployeeId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(lr => lr.LeaveType)
                      .WithMany(lt => lt.LeaveRequests)
                      .HasForeignKey(lr => lr.LeaveTypeId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(lr => lr.Manager)
                      .WithMany()
                      .HasForeignKey(lr => lr.ManagerId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // PermissionRequest Configuration
            modelBuilder.Entity<PermissionRequest>(entity =>
            {
                entity.HasKey(pr => pr.Id);
                entity.Property(pr => pr.Id).HasMaxLength(50);
                entity.Property(pr => pr.PermissionType).HasConversion<string>().HasMaxLength(30);
                entity.Property(pr => pr.Status).HasConversion<string>().HasMaxLength(20);

                entity.HasOne(pr => pr.Employee)
                      .WithMany(e => e.PermissionRequests)
                      .HasForeignKey(pr => pr.EmployeeId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(pr => pr.Approver)
                      .WithMany()
                      .HasForeignKey(pr => pr.ApprovedBy)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // WorkSchedule Configuration
            modelBuilder.Entity<WorkSchedule>(entity =>
            {
                entity.HasKey(ws => ws.Id);
                entity.Property(ws => ws.Title).HasMaxLength(150).IsRequired();
                entity.Property(ws => ws.TimeMode).HasConversion<string>().HasMaxLength(20);
                entity.Property(ws => ws.TargetScope).HasConversion<string>().HasMaxLength(20);
                entity.Property(ws => ws.HoursPerDay).HasPrecision(4, 2);
            });

            // ScheduleAssignment Configuration
            modelBuilder.Entity<ScheduleAssignment>(entity =>
            {
                entity.HasKey(sa => sa.Id);

                entity.HasOne(sa => sa.Schedule)
                      .WithMany(ws => ws.Assignments)
                      .HasForeignKey(sa => sa.ScheduleId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(sa => sa.Department)
                      .WithMany(d => d.ScheduleAssignments)
                      .HasForeignKey(sa => sa.DepartmentId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(sa => sa.Employee)
                      .WithMany(e => e.ScheduleAssignments)
                      .HasForeignKey(sa => sa.EmployeeId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ScheduleSession Configuration (personal weekly sessions)
            modelBuilder.Entity<ScheduleSession>(entity =>
            {
                entity.HasKey(s => s.Id);
                entity.Property(s => s.Subject).HasMaxLength(150).IsRequired();
                entity.Property(s => s.GroupName).HasMaxLength(50);
                entity.Property(s => s.Room).HasMaxLength(50);

                entity.HasOne(s => s.Employee)
                      .WithMany()
                      .HasForeignKey(s => s.EmployeeId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(s => s.EmployeeId);
            });

            // ExamSchedule Configuration
            modelBuilder.Entity<ExamSchedule>(entity =>
            {
                entity.HasKey(ex => ex.Id);
                entity.Property(ex => ex.Title).HasMaxLength(150).IsRequired();
                entity.Property(ex => ex.TimeSlot).HasMaxLength(50);
                entity.Property(ex => ex.RoomLocation).HasMaxLength(100);

                entity.HasOne(ex => ex.Employee)
                      .WithMany(e => e.ExamSchedules)
                      .HasForeignKey(ex => ex.EmployeeId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // SystemSetting Configuration (key/value store for SettingsController)
            modelBuilder.Entity<SystemSetting>(entity =>
            {
                entity.HasKey(s => s.Key);
                entity.Property(s => s.Key).HasMaxLength(60);
                entity.Property(s => s.Value).HasMaxLength(255).IsRequired();
                entity.Property(s => s.Description).HasMaxLength(255);
            });
        }
    }
}