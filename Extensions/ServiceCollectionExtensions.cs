using Foxel.Services;
using Foxel.Services.Interface;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Foxel.Services.StorageProvider;

namespace Foxel.Extensions;

public static class ServiceCollectionExtensions
{
    public static void AddCoreServices(this IServiceCollection services)
    {
        services.AddSingleton<IConfigService, ConfigService>();
        services.AddSingleton<IAiService, AiService>();
        services.AddSingleton<IPictureService, PictureService>();
        services.AddSingleton<IUserService, UserService>();
        services.AddSingleton<ITagService, TagService>();
        services.AddSingleton<IAlbumService, AlbumService>();
        services.AddSingleton<IBackgroundTaskQueue, BackgroundTaskQueue>();
        services.AddHostedService<QueuedHostedService>();
        services.AddSingleton<LocalStorageProvider>();
        services.AddSingleton<TelegramStorageProvider>();
        services.AddSingleton<S3StorageProvider>();
        services.AddSingleton<IStorageProviderFactory, StorageProviderFactory>();
        services.AddSingleton<IDatabaseInitializer, DatabaseInitializer>();
    }

    public static void AddApplicationDbContext(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrEmpty(connectionString))
        {
            connectionString = Environment.GetEnvironmentVariable("DEFAULT_CONNECTION");
        }

        Console.WriteLine($"数据库连接: {connectionString}");
        services.AddDbContextFactory<MyDbContext>(options =>
            options.UseNpgsql(connectionString, o => o.UseVector()));
    }

    public static void AddApplicationOpenApi(this IServiceCollection services)
    {
        services.AddOpenApi(opt => { opt.AddDocumentTransformer<BearerSecuritySchemeTransformer>(); });
    }

    public static void AddApplicationAuthentication(this IServiceCollection services)
    {
        IConfigService configuration = services.BuildServiceProvider().GetRequiredService<IConfigService>();
        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidAudience = configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(configuration["Jwt:SecretKey"]))
                };
            });
    }

    public static void AddApplicationAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });
    }

    public static void AddApplicationCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy(name: "MyAllowSpecificOrigins",
                policy => { policy.WithOrigins().AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod(); });
        });
    }
}