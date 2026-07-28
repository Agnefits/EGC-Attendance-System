using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using Attendance_System.Enums;
using Attendance_System.UnitOfWork;

namespace Attendance_System.Middleware
{
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
    public class AuthorizedRolesAttribute : Attribute, IAsyncAuthorizationFilter
    {
        private readonly UserRole[] _roles;

        public AuthorizedRolesAttribute(params UserRole[] roles)
        {
            _roles = roles;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;

            if (user == null || user.Identity == null || !user.Identity.IsAuthenticated)
            {
                context.Result = new ObjectResult(new { message = "Unauthorized. Please log in first." })
                {
                    StatusCode = 401
                };
                return;
            }

            var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
            {
                context.Result = new ObjectResult(new { message = "Unauthorized. Invalid user context." })
                {
                    StatusCode = 401
                };
                return;
            }

            // Database verification check
            var unitOfWork = context.HttpContext.RequestServices.GetRequiredService<IUnitOfWork>();
            var dbUser = await unitOfWork.Users.GetByIdAsync(userId);

            if (dbUser == null || dbUser.DeletedAt != null || !dbUser.IsActive)
            {
                context.Result = new ObjectResult(new { message = "Unauthorized. Account does not exist, is inactive, or has been deleted." })
                {
                    StatusCode = 401
                };
                return;
            }

            var userRoleClaim = user.FindFirst(ClaimTypes.Role)?.Value;

            if (string.IsNullOrEmpty(userRoleClaim) || !Enum.TryParse<UserRole>(userRoleClaim, out var userRole))
            {
                context.Result = new ObjectResult(new { message = "Forbidden. Invalid user role." })
                {
                    StatusCode = 403
                };
                return;
            }

            if (_roles.Length > 0 && !_roles.Contains(userRole))
            {
                context.Result = new ObjectResult(new { message = "Forbidden. You do not have permission to access this resource." })
                {
                    StatusCode = 403
                };
            }
        }
    }
}
