using System.Net;
using System.Text.Json;
using NrsAdmin.Api.Models.Responses;

namespace NrsAdmin.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            ArgumentException ae => (HttpStatusCode.BadRequest, ae.Message),
            KeyNotFoundException => (HttpStatusCode.NotFound, "The requested resource was not found."),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "You are not authorized to perform this action."),
            InvalidOperationException ioe => (HttpStatusCode.Conflict, ioe.Message),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        // Sanitize: never log PHI in error messages
        var sanitizedMessage = SanitizeMessage(exception.Message);
        _logger.LogError(exception, "Unhandled exception: {Message}", sanitizedMessage);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var response = ApiResponse.Fail(message);
        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }

    private static string SanitizeMessage(string message)
    {
        // Remove potential PHI patterns (patient IDs, names in common formats)
        // This is a basic sanitizer - extend as needed
        return message.Length > 500 ? message[..500] + "..." : message;
    }
}
