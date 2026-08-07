using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Attendance_System.Data;
using Attendance_System.UnitOfWork;
using Attendance_System.Services;
using Attendance_System.Services.Interfaces;
using Attendance_System.Services.Classes;
using Attendance_System.Repositories.Interfaces;
using Attendance_System.Repositories.Classes;
using Attendance_System.Middleware;

namespace Attendance_System
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add Database Context
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(connectionString));

            // Add Repositories & UnitOfWork
            builder.Services.AddScoped<IUnitOfWork, UnitOfWork.UnitOfWork>();
            builder.Services.AddScoped<ICollegeRepository, CollegeRepository>();
            builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
            builder.Services.AddScoped<IUserRepository, UserRepository>();
            builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
            builder.Services.AddScoped<IAttendanceLogRepository, AttendanceLogRepository>();
            builder.Services.AddScoped<ILeaveTypeRepository, LeaveTypeRepository>();
            builder.Services.AddScoped<ILeaveRequestRepository, LeaveRequestRepository>();
            builder.Services.AddScoped<IPermissionRequestRepository, PermissionRequestRepository>();
            builder.Services.AddScoped<IWorkScheduleRepository, WorkScheduleRepository>();
            builder.Services.AddScoped<IScheduleAssignmentRepository, ScheduleAssignmentRepository>();
            builder.Services.AddScoped<IExamScheduleRepository, ExamScheduleRepository>();

            // Add Application Services
            builder.Services.AddScoped<IJwtService, JwtService>();
            builder.Services.AddScoped<IEmailService, EmailService>();
            builder.Services.AddScoped<IValidationService, ValidationService>();

            // Note: Add Attendance Notification Service (Background Service)
            // builder.Services.AddHostedService<AttendanceNotificationService>();

            // CORS — allow the React front-end to call the API.
            // Adjust the origin(s) to match where the front-end is served.
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("frontend", policy => policy
                    .SetIsOriginAllowed(_ => true).AllowCredentials()
                    .AllowAnyHeader()
                    .AllowAnyMethod());
            });

            // Add JWT Authentication
            var jwtSettings = builder.Configuration.GetSection("JwtSettings");
            var keyStr = jwtSettings["Key"] ?? "SuperSecretKeyForAITUAttendanceSystem2026!";
            var key = Encoding.ASCII.GetBytes(keyStr);

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.SaveToken = true;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = jwtSettings["Issuer"] ?? "AITUAttendanceSystem",
                    ValidateAudience = true,
                    ValidAudience = jwtSettings["Audience"] ?? "AITUAttendanceUsers",
                    ClockSkew = TimeSpan.Zero
                };
            });

            builder.Services.AddAuthorization();
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    // Enums come out as lower-camelCase strings ("present", "pending", "morning"...)
                    // matching the string ids the front-end already compares against everywhere,
                    // instead of raw numeric enum values. allowIntegerValues keeps old numeric
                    // payloads readable too, so nothing that currently sends numbers breaks.
                    options.JsonSerializerOptions.Converters.Add(
                        new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: true));
                });

            // Configure Swagger / OpenAPI Generator with JWT Bearer security setup
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "AITU Attendance System API",
                    Version = "v1",
                    Description = "RESTful API Backend Specification for Assiut International Technological University (AITU) Attendance Management System."
                });

                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            });

            var app = builder.Build();

            // Global exception handling — must be first so it wraps the whole pipeline.
            app.UseMiddleware<ExceptionMiddleware>();

            // Auto Migration & Data Seeding
            await SeedData.InitializeAsync(app.Services);

            // Enable Swagger UI middleware
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "AITU Attendance System API v1");
                c.RoutePrefix = "swagger";
            });

            // CORS must run before authentication/authorization.
            app.UseCors("frontend");

            // Serves wwwroot/* over HTTP (e.g. uploaded avatars at /uploads/avatars/...).
            app.UseStaticFiles();

            if (!app.Environment.IsDevelopment())
            {
                app.UseHttpsRedirection();
            }

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            await app.RunAsync();
        }
    }
}