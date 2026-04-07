using System.Text;
using System.Text.Json;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NrsAdmin.Api.Auth;
using NrsAdmin.Api.Configuration;
using NrsAdmin.Api.Middleware;
using NrsAdmin.Api.Repositories;
using NrsAdmin.Api.Services;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Add connection.json config source (overrides appsettings.json when present)
    var connectionJsonPath = Path.Combine(AppContext.BaseDirectory, "connection.json");
    ((IConfigurationBuilder)builder.Configuration).Add(new ConnectionJsonConfigurationSource(connectionJsonPath));

    // Serilog
    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console(
            outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
        .WriteTo.File("logs/nrsadmin-.log",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 30,
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}"));

    // Configuration
    builder.Services.Configure<DatabaseSettings>(builder.Configuration.GetSection("Database"));
    builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
    builder.Services.Configure<MappingFileSettings>(builder.Configuration.GetSection("MappingFile"));
    builder.Services.Configure<LdapSettings>(builder.Configuration.GetSection("Ldap"));
    builder.Services.Configure<ReportTemplateSettings>(builder.Configuration.GetSection("ReportTemplate"));

    // Authentication
    var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()!;
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

    builder.Services.AddAuthorization();

    // Controllers
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.DefaultIgnoreCondition =
                System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        });

    // FluentValidation
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddValidatorsFromAssemblyContaining<Program>();

    // Swagger
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "NRS Admin API",
            Version = "v1",
            Description = "Administrative API for Novarad NovaPACS/NovaRIS systems"
        });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
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

    // CORS (Next.js dev server)
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("NextJsDev", policy =>
        {
            policy.WithOrigins("http://localhost:3000", "http://localhost:3001")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    });

    // DI Registration — Connection
    builder.Services.AddSingleton<ConnectionSettingsService>();

    // DI Registration — Auth
    builder.Services.AddSingleton<NovaradPasswordHasher>();
    builder.Services.AddSingleton<JwtTokenService>();
    builder.Services.AddSingleton<ILdapAuthenticationService, LdapAuthenticationService>();

    // DI Registration — Repositories
    builder.Services.AddScoped<UserRepository>();
    builder.Services.AddScoped<FacilityRepository>();
    builder.Services.AddScoped<ModalityRepository>();
    builder.Services.AddScoped<ModalityTypeRepository>();
    builder.Services.AddScoped<AeMonitorRepository>();
    builder.Services.AddScoped<StudyRepository>();
    builder.Services.AddScoped<DashboardRepository>();
    builder.Services.AddScoped<SettingsRepository>();
    builder.Services.AddScoped<Hl7Repository>();
    builder.Services.AddScoped<PacsRoutingRepository>();
    builder.Services.AddScoped<BillingCodeRepository>();
    builder.Services.AddScoped<IcdCodeRepository>();
    builder.Services.AddScoped<ReportTemplateRepository>();
    builder.Services.AddScoped<RisRepository>();

    // DI Registration — Services
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<MappingFileService>();
    builder.Services.AddScoped<ReportTemplateService>();

    var app = builder.Build();

    // Middleware pipeline
    app.UseMiddleware<ExceptionHandlingMiddleware>();
    app.UseSerilogRequestLogging();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "NRS Admin API v1");
        });
    }

    app.UseCors("NextJsDev");
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    var connectionService = app.Services.GetRequiredService<ConnectionSettingsService>();
    Log.Information("NRS Admin API starting on {Environment} — DB configured: {IsConfigured}",
        app.Environment.EnvironmentName, connectionService.IsConfigured);
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
