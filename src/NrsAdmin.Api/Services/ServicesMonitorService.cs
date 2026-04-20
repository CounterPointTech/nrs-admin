using System.Runtime.InteropServices;
using System.ServiceProcess;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Models.Domain;

namespace NrsAdmin.Api.Services;

public class ServicesMonitorService
{
    private readonly IOptionsMonitor<ServicesMonitorSettings> _settings;
    private readonly ILogger<ServicesMonitorService> _logger;

    public ServicesMonitorService(
        IOptionsMonitor<ServicesMonitorSettings> settings,
        ILogger<ServicesMonitorService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public ServicesSnapshot GetSnapshot()
    {
        var settings = _settings.CurrentValue;
        var remote = !string.IsNullOrWhiteSpace(settings.Host);
        var snapshot = new ServicesSnapshot
        {
            Host = remote ? settings.Host! : "local",
            Remote = remote,
            CheckedAt = DateTime.UtcNow
        };

        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            snapshot.Error = "Service monitoring is supported only on Windows.";
            return snapshot;
        }

        try
        {
            var all = remote
                ? ServiceController.GetServices(settings.Host!)
                : ServiceController.GetServices();

            try
            {
                var patterns = CompilePatterns(settings.Patterns);
                var exactNames = new HashSet<string>(settings.ExactNames, StringComparer.OrdinalIgnoreCase);

                foreach (var svc in all.OrderBy(s => s.DisplayName, StringComparer.OrdinalIgnoreCase))
                {
                    try
                    {
                        if (!ShouldInclude(svc.ServiceName, patterns, exactNames))
                            continue;

                        snapshot.Services.Add(new ServiceInfo
                        {
                            Name = svc.ServiceName,
                            DisplayName = svc.DisplayName,
                            Status = svc.Status.ToString(),
                            CanStop = svc.CanStop,
                            CanPauseAndContinue = svc.CanPauseAndContinue
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "Skipping service {Name} — could not read state", svc.ServiceName);
                    }
                }
            }
            finally
            {
                foreach (var svc in all)
                    svc.Dispose();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enumerate services on host {Host}", snapshot.Host);
            snapshot.Error = $"Could not query services on {snapshot.Host}: {ex.Message}";
        }

        return snapshot;
    }

    public enum ServiceAction { Start, Stop, Restart }

    public class ServiceActionResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public ServiceInfo? ServiceInfo { get; set; }
    }

    /// <summary>
    /// Start, stop, or restart a named service on the configured host.
    /// Waits up to <paramref name="timeoutSeconds"/> for the service to reach the target state
    /// before returning. Callers should be authorized; every invocation is logged.
    /// </summary>
    public ServiceActionResult Control(string serviceName, ServiceAction action, int timeoutSeconds = 30)
    {
        var settings = _settings.CurrentValue;
        var remote = !string.IsNullOrWhiteSpace(settings.Host);
        var hostLabel = remote ? settings.Host! : "local";

        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            return new ServiceActionResult { Error = "Service control is supported only on Windows." };

        if (string.IsNullOrWhiteSpace(serviceName))
            return new ServiceActionResult { Error = "Service name is required." };

        // Safety: only allow controlling services we're already monitoring.
        // This prevents a caller from using this endpoint to flip arbitrary system services.
        var allowedPatterns = CompilePatterns(settings.Patterns);
        var allowedExact = new HashSet<string>(settings.ExactNames, StringComparer.OrdinalIgnoreCase);
        if (!ShouldInclude(serviceName, allowedPatterns, allowedExact))
        {
            return new ServiceActionResult
            {
                Error = $"Service '{serviceName}' is outside the monitored set. Add it to ServicesMonitor:Patterns or :ExactNames to allow control."
            };
        }

        ServiceController? svc = null;
        try
        {
            svc = remote
                ? new ServiceController(serviceName, settings.Host!)
                : new ServiceController(serviceName);

            // Touch a property to confirm the service actually exists on the host.
            _ = svc.DisplayName;

            var timeout = TimeSpan.FromSeconds(Math.Max(1, timeoutSeconds));

            switch (action)
            {
                case ServiceAction.Start:
                    if (svc.Status is ServiceControllerStatus.Running or ServiceControllerStatus.StartPending)
                        break;
                    svc.Start();
                    svc.WaitForStatus(ServiceControllerStatus.Running, timeout);
                    break;

                case ServiceAction.Stop:
                    if (svc.Status == ServiceControllerStatus.Stopped)
                        break;
                    if (!svc.CanStop)
                        return new ServiceActionResult { Error = $"Service '{serviceName}' does not accept stop requests." };
                    svc.Stop();
                    svc.WaitForStatus(ServiceControllerStatus.Stopped, timeout);
                    break;

                case ServiceAction.Restart:
                    if (svc.Status != ServiceControllerStatus.Stopped)
                    {
                        if (!svc.CanStop)
                            return new ServiceActionResult { Error = $"Service '{serviceName}' does not accept stop requests — cannot restart." };
                        svc.Stop();
                        svc.WaitForStatus(ServiceControllerStatus.Stopped, timeout);
                    }
                    svc.Refresh();
                    svc.Start();
                    svc.WaitForStatus(ServiceControllerStatus.Running, timeout);
                    break;
            }

            svc.Refresh();
            _logger.LogInformation("Service {Action} OK — host {Host} service {Name} final status {Status}",
                action, hostLabel, serviceName, svc.Status);

            return new ServiceActionResult
            {
                Success = true,
                ServiceInfo = new ServiceInfo
                {
                    Name = svc.ServiceName,
                    DisplayName = svc.DisplayName,
                    Status = svc.Status.ToString(),
                    CanStop = svc.CanStop,
                    CanPauseAndContinue = svc.CanPauseAndContinue
                }
            };
        }
        catch (System.ServiceProcess.TimeoutException ex)
        {
            _logger.LogWarning(ex, "Service {Action} timed out — host {Host} service {Name}",
                action, hostLabel, serviceName);
            return new ServiceActionResult
            {
                Error = $"Timed out waiting for '{serviceName}' to reach the expected state. The command may still be in progress — refresh in a few seconds."
            };
        }
        catch (InvalidOperationException ex)
        {
            // Thrown when the service doesn't exist, access is denied, or RPC fails.
            _logger.LogWarning(ex, "Service {Action} failed — host {Host} service {Name}",
                action, hostLabel, serviceName);
            return new ServiceActionResult { Error = ex.Message };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during service {Action} — host {Host} service {Name}",
                action, hostLabel, serviceName);
            return new ServiceActionResult { Error = ex.Message };
        }
        finally
        {
            svc?.Dispose();
        }
    }

    private static List<Regex> CompilePatterns(IEnumerable<string>? patterns)
    {
        if (patterns == null) return new List<Regex>();
        var result = new List<Regex>();
        foreach (var pattern in patterns)
        {
            if (string.IsNullOrWhiteSpace(pattern)) continue;
            var regex = "^" + Regex.Escape(pattern).Replace("\\*", ".*").Replace("\\?", ".") + "$";
            result.Add(new Regex(regex, RegexOptions.IgnoreCase | RegexOptions.Compiled));
        }
        return result;
    }

    private static bool ShouldInclude(string serviceName, List<Regex> patterns, HashSet<string> exactNames)
    {
        if (exactNames.Contains(serviceName)) return true;
        foreach (var r in patterns)
            if (r.IsMatch(serviceName)) return true;
        return false;
    }
}
