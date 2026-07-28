using System;
using System.Collections.Generic;

namespace Attendance_System.Validation
{
    public class BusinessValidationException : Exception
    {
        public Dictionary<string, string[]> Errors { get; }

        public BusinessValidationException(string propertyName, string errorMessage)
            : base("Validation failed.")
        {
            Errors = new Dictionary<string, string[]>
            {
                { propertyName, new[] { errorMessage } }
            };
        }

        public BusinessValidationException(Dictionary<string, string[]> errors)
            : base("Validation failed.")
        {
            Errors = errors;
        }
    }
}
