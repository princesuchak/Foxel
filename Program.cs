using Foxel.Extensions;
using Foxel.Services.Interface;

var builder = WebApplication.CreateBuilder(args);
var environment = builder.Environment;
Console.WriteLine($"当前环境: {environment.EnvironmentName}");
builder.Services.AddMemoryCache();
builder.Services.AddApplicationDbContext(builder.Configuration);
builder.Services.AddApplicationOpenApi();
builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddCoreServices();
builder.Services.AddHttpContextAccessor();
builder.Services.AddApplicationAuthentication();
builder.Services.AddApplicationAuthorization();
builder.Services.AddApplicationCors();

var app = builder.Build();

// 初始化数据库配置
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<IDatabaseInitializer>();
    await initializer.InitializeAsync();
}

app.UseApplicationStaticFiles();
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}
app.UseHttpsRedirection();
app.UseApplicationOpenApi();
app.UseCors("MyAllowSpecificOrigins");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();