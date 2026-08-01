using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Attendance_System.Models;
using Attendance_System.Enums;
using Attendance_System.Middleware;
using Attendance_System.Data;

namespace Attendance_System.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public SettingsController(AppDbContext context) { _context = context; }

        // Default values used to back-fill anything not yet stored in the DB.
        // These centralize the constants currently hardcoded in the front-end
        // (campus geofence in Attendance.js, 240 monthly minutes in useNotifications.js).
        private static readonly Dictionary<string, string> Defaults = new()
        {
            ["campus.lat"] = "27.184187",
            ["campus.lng"] = "31.172920",
            ["campus.radius"] = "500",
            ["permissions.monthlyMinutes"] = "240",
            ["leave.annualDays"] = "21",
            ["leave.yearStartMonth"] = "7"
        };

        // GET /api/settings  — merged defaults + stored overrides
        [HttpGet]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> GetAll()
        {
            var stored = await _context.SystemSettings.ToDictionaryAsync(s => s.Key, s => s.Value);
            var merged = Defaults.ToDictionary(kv => kv.Key, kv => stored.TryGetValue(kv.Key, out var v) ? v : kv.Value);
            // include any custom stored keys not present in Defaults
            foreach (var kv in stored)
                merged[kv.Key] = kv.Value;

            return Ok(new { success = true, data = merged });
        }

        // GET /api/settings/{key}
        [HttpGet("{key}")]
        [AuthorizedRoles(UserRole.Admin, UserRole.Hr)]
        public async Task<IActionResult> GetByKey(string key)
        {
            var stored = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == key);
            var value = stored?.Value ?? (Defaults.TryGetValue(key, out var d) ? d : null);
            if (value == null) return NotFound(new { success = false, message = "Setting not found" });

            return Ok(new { success = true, data = new { key, value } });
        }

        // PUT /api/settings/{key}  — upsert
        [HttpPut("{key}")]
        [AuthorizedRoles(UserRole.Admin)]
        public async Task<IActionResult> Upsert(string key, [FromBody] UpdateSettingDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Value))
                return BadRequest(new { success = false, message = "Value is required" });

            var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting == null)
            {
                setting = new SystemSetting { Key = key, Value = dto.Value, Description = dto.Description, UpdatedAt = DateTime.UtcNow };
                _context.SystemSettings.Add(setting);
            }
            else
            {
                setting.Value = dto.Value;
                setting.Description = dto.Description ?? setting.Description;
                setting.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Setting saved", data = new { setting.Key, setting.Value } });
        }
    }

    public class UpdateSettingDto
    {
        public string Value { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}