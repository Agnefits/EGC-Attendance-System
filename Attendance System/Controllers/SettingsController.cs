using Microsoft.AspNetCore.Mvc;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.UnitOfWork;
using Attendance_System.DTOs.Settings;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        private static readonly Dictionary<string, string> Defaults = new()
        {
            ["campus.lat"] = "27.184187",
            ["campus.lng"] = "31.172920",
            ["campus.radius"] = "500",
            ["permissions.monthlyMinutes"] = "240",
            ["leave.annualDays"] = "21",
            ["leave.yearStartMonth"] = "7"
        };

        public SettingsController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> GetAll()
        {
            var allSettings = await _unitOfWork.SystemSettings.GetAllAsync();
            var stored = allSettings.ToDictionary(s => s.Key, s => s.Value);

            var merged = Defaults.ToDictionary(kv => kv.Key, kv => stored.TryGetValue(kv.Key, out var v) ? v : kv.Value);

            foreach (var kv in stored)
                merged[kv.Key] = kv.Value;

            return Ok(new { success = true, data = merged });
        }

        [HttpGet("{key}")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> GetByKey(string key)
        {
            var setting = await _unitOfWork.SystemSettings.GetByIdAsync(key);

            var value = setting?.Value ?? (Defaults.TryGetValue(key, out var d) ? d : null);
            if (value == null)
                return NotFound(new { success = false, message = "Setting not found" });

            return Ok(new
            {
                success = true,
                data = new SettingDto { Key = key, Value = value }
            });
        }

        [HttpPut("{key}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Upsert(string key, [FromBody] UpdateSettingDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Value))
                return BadRequest(new { success = false, message = "Value is required" });

            var setting = await _unitOfWork.SystemSettings.GetByIdAsync(key);

            if (setting == null)
            {
                setting = new SystemSetting
                {
                    Key = key,
                    Value = dto.Value,
                    Description = dto.Description,
                    UpdatedAt = DateTime.UtcNow
                };
                await _unitOfWork.SystemSettings.AddAsync(setting);
            }
            else
            {
                setting.Value = dto.Value;
                setting.Description = dto.Description ?? setting.Description;
                setting.UpdatedAt = DateTime.UtcNow;
                _unitOfWork.SystemSettings.Update(setting);
            }

            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Setting saved",
                data = new { setting.Key, setting.Value }
            });
        }
    }
}