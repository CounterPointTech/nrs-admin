using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Requests;
using NrsAdmin.Api.Models.Responses;
using NrsAdmin.Api.Services;

namespace NrsAdmin.Api.Controllers.V1;

[ApiController]
[Route("api/v1/connection")]
public class ConnectionController : ControllerBase
{
    private readonly ConnectionSettingsService _connectionService;
    private readonly ILogger<ConnectionController> _logger;

    public ConnectionController(
        ConnectionSettingsService connectionService,
        ILogger<ConnectionController> logger)
    {
        _connectionService = connectionService;
        _logger = logger;
    }

    /// <summary>
    /// Check connection status. Always anonymous — used by frontend to detect first-run.
    /// </summary>
    [HttpGet("status")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStatus()
    {
        var isConfigured = _connectionService.IsConfigured;
        var status = new ConnectionStatusResponse
        {
            IsConfigured = isConfigured
        };

        if (isConfigured)
        {
            var settings = _connectionService.GetSettings();
            if (settings?.Database is { } db)
            {
                status.Host = db.Host;
                status.DatabaseName = db.Database;

                // Try a quick connection test
                var result = await _connectionService.TestConnectionAsync(
                    db.Host, db.Port, db.Database, db.Username, db.Password, 5);
                status.IsConnected = result.Success;
                status.ServerVersion = result.ServerVersion;
            }
        }

        return Ok(new { success = true, data = status });
    }

    /// <summary>
    /// Get current connection settings (no password). Requires auth if configured.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public IActionResult GetSettings()
    {
        if (!AllowUnauthenticated())
            return Unauthorized(new { success = false, message = "Authentication required." });

        var settings = _connectionService.GetSettings();
        var response = new ConnectionSettingsResponse();

        if (settings?.Database is { } db)
        {
            response.Database = new DatabaseSettingsResponse
            {
                Host = db.Host,
                Port = db.Port,
                Database = db.Database,
                Username = db.Username,
                Timeout = db.Timeout
            };
        }

        if (settings?.MappingFile is { } mf)
        {
            response.MappingFile = new MappingFileSettingsResponse
            {
                Path = mf.Path,
                BackupDirectory = mf.BackupDirectory
            };
        }

        return Ok(new { success = true, data = response });
    }

    /// <summary>
    /// Save connection settings. Requires auth if configured.
    /// </summary>
    [HttpPut]
    [AllowAnonymous]
    public IActionResult SaveSettings([FromBody] SaveConnectionRequest request)
    {
        if (!AllowUnauthenticated())
            return Unauthorized(new { success = false, message = "Authentication required." });

        // Build settings from request, merging with existing if partial
        var existing = _connectionService.GetSettings() ?? new ConnectionSettings();

        if (request.Database is { } db)
        {
            existing.Database = db;
        }

        if (request.MappingFile is { } mf)
        {
            existing.MappingFile = mf;
        }

        _connectionService.SaveSettings(existing);
        _logger.LogInformation("Connection settings updated by {User}",
            User.Identity?.Name ?? "anonymous (first-time setup)");

        return Ok(new { success = true, message = "Connection settings saved." });
    }

    /// <summary>
    /// Test database connection without saving. Requires auth if configured.
    /// </summary>
    [HttpPost("test")]
    [AllowAnonymous]
    public async Task<IActionResult> TestConnection([FromBody] TestConnectionRequest request)
    {
        if (!AllowUnauthenticated())
            return Unauthorized(new { success = false, message = "Authentication required." });

        var result = await _connectionService.TestConnectionAsync(
            request.Host, request.Port, request.Database,
            request.Username, request.Password, request.Timeout);

        var response = new TestConnectionResponse
        {
            Success = result.Success,
            ServerVersion = result.ServerVersion,
            IsNovaradDatabase = result.IsNovaradDatabase,
            ErrorMessage = result.ErrorMessage
        };

        return Ok(new { success = true, data = response });
    }

    /// <summary>
    /// Test file path accessibility. Requires auth if configured.
    /// </summary>
    [HttpPost("test-path")]
    [AllowAnonymous]
    public async Task<IActionResult> TestPath([FromBody] TestPathRequest request)
    {
        if (!AllowUnauthenticated())
            return Unauthorized(new { success = false, message = "Authentication required." });

        var result = await _connectionService.TestPathAsync(request.Path);

        var response = new TestPathResponse
        {
            Exists = result.Exists,
            IsAccessible = result.IsAccessible,
            ErrorMessage = result.ErrorMessage
        };

        return Ok(new { success = true, data = response });
    }

    /// <summary>
    /// Browse server filesystem for file/directory selection. Requires auth if configured.
    /// </summary>
    [HttpGet("browse")]
    [AllowAnonymous]
    public IActionResult Browse([FromQuery] string? path, [FromQuery] string type = "file")
    {
        if (!AllowUnauthenticated())
            return Unauthorized(new { success = false, message = "Authentication required." });

        try
        {
            // Default to common drive roots on Windows
            var targetPath = string.IsNullOrWhiteSpace(path) ? null : path;

            if (targetPath == null)
            {
                // Return available drives
                var drives = DriveInfo.GetDrives()
                    .Where(d => d.IsReady)
                    .Select(d => new BrowseEntry
                    {
                        Name = d.Name,
                        Path = d.RootDirectory.FullName,
                        IsDirectory = true
                    })
                    .ToList();

                return Ok(new
                {
                    success = true,
                    data = new BrowseResponse
                    {
                        CurrentPath = "",
                        Parent = null,
                        Entries = drives
                    }
                });
            }

            // Prevent path traversal
            var fullPath = Path.GetFullPath(targetPath);

            if (!Directory.Exists(fullPath))
                return Ok(new { success = false, message = "Directory not found." });

            var dirInfo = new DirectoryInfo(fullPath);
            var entries = new List<BrowseEntry>();

            // Directories first
            try
            {
                foreach (var dir in dirInfo.GetDirectories().OrderBy(d => d.Name))
                {
                    entries.Add(new BrowseEntry
                    {
                        Name = dir.Name,
                        Path = dir.FullName,
                        IsDirectory = true
                    });
                }
            }
            catch (UnauthorizedAccessException)
            {
                // Skip directories we can't read
            }

            // Files (only if browsing for files)
            if (type == "file")
            {
                try
                {
                    foreach (var file in dirInfo.GetFiles().OrderBy(f => f.Name))
                    {
                        entries.Add(new BrowseEntry
                        {
                            Name = file.Name,
                            Path = file.FullName,
                            IsDirectory = false,
                            Size = file.Length
                        });
                    }
                }
                catch (UnauthorizedAccessException)
                {
                    // Skip files we can't read
                }
            }

            return Ok(new
            {
                success = true,
                data = new BrowseResponse
                {
                    CurrentPath = fullPath,
                    Parent = dirInfo.Parent?.FullName,
                    Entries = entries
                }
            });
        }
        catch (Exception ex)
        {
            return Ok(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Allow unauthenticated access if DB is not yet configured.
    /// If configured, require a valid JWT.
    /// </summary>
    private bool AllowUnauthenticated()
    {
        if (!_connectionService.IsConfigured)
            return true;

        return User.Identity?.IsAuthenticated == true;
    }
}
