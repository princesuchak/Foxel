using Microsoft.Extensions.FileProviders;
using Scalar.AspNetCore;

namespace Foxel.Extensions;

public static class ApplicationBuilderExtensions
{
    public static void UseApplicationStaticFiles(this WebApplication app)
    {
        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
        if (!Directory.Exists(uploadsPath))
        {
            Directory.CreateDirectory(uploadsPath);
        }

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(uploadsPath),
            RequestPath = "/uploads"
        });
    }

    public static void UseApplicationOpenApi(this WebApplication app)
    {
        app.MapOpenApi();
    }
}