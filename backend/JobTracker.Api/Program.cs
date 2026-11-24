using System.Text.Json;
using System.Text.Json.Serialization;
using JobTracker.Api.Data;
using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// SQLite: the whole database is one small file (see ConnectionStrings:Default).
var connectionString = builder.Configuration.GetConnectionString("Default")!;
var dataSource = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(connectionString).DataSource;
if (Path.GetDirectoryName(Path.GetFullPath(dataSource)) is { } dataDir)
    Directory.CreateDirectory(dataDir);

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

// Enums travel as camelCase strings: "applied", "interviewing", ...
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));

var app = builder.Build();

// Create the tables on first start. (For a schema that will keep evolving,
// switch to EF Core migrations: `dotnet ef migrations add Initial`.)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

var api = app.MapGroup("/api");

// ---- Jobs ---------------------------------------------------------------

api.MapGet("/jobs", async (AppDbContext db) =>
    await db.Jobs.AsNoTracking().OrderByDescending(j => j.UpdatedUtc).ToListAsync());

api.MapGet("/jobs/{id:guid}", async (Guid id, AppDbContext db) =>
    await db.Jobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == id) is { } job
        ? Results.Ok(job)
        : Results.NotFound());

api.MapPost("/jobs", async (JobInput input, AppDbContext db) =>
{
    if (Validate(input) is { } errors) return Results.ValidationProblem(errors);

    var job = new Job();
    Apply(job, input);
    db.Jobs.Add(job);
    await db.SaveChangesAsync();
    return Results.Created($"/api/jobs/{job.Id}", job);
});

api.MapPut("/jobs/{id:guid}", async (Guid id, JobInput input, AppDbContext db) =>
{
    if (Validate(input) is { } errors) return Results.ValidationProblem(errors);

    var job = await db.Jobs.FindAsync(id);
    if (job is null) return Results.NotFound();

    Apply(job, input);
    await db.SaveChangesAsync();
    return Results.Ok(job);
});

api.MapDelete("/jobs/{id:guid}", async (Guid id, AppDbContext db) =>
{
    var job = await db.Jobs.FindAsync(id);
    if (job is null) return Results.NotFound();

    db.Jobs.Remove(job);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ---- Settings (the "leaving between" window) -----------------------------

api.MapGet("/settings", async (AppDbContext db) =>
    await db.Settings.AsNoTracking().FirstAsync());

api.MapPut("/settings", async (SettingsInput input, AppDbContext db) =>
{
    if (!IsTime(input.LeaveFrom) || !IsTime(input.LeaveTo))
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["leave"] = ["Times must look like HH:mm."]
        });

    var settings = await db.Settings.FirstAsync();
    settings.LeaveFrom = input.LeaveFrom;
    settings.LeaveTo = input.LeaveTo;
    await db.SaveChangesAsync();
    return Results.Ok(settings);
});

app.Run();

// ---- helpers ---------------------------------------------------------------

static Dictionary<string, string[]>? Validate(JobInput i) =>
    string.IsNullOrWhiteSpace(i.Company) && string.IsNullOrWhiteSpace(i.Role)
        ? new() { ["company"] = ["Company or role is required."] }
        : null;

static bool IsTime(string? s) => TimeOnly.TryParseExact(s, "HH:mm", out _);

static void Apply(Job job, JobInput i)
{
    job.Company = i.Company?.Trim() ?? "";
    job.Role = i.Role?.Trim() ?? "";
    job.Status = i.Status;
    job.Applied = i.Applied;
    job.NextStep = Clean(i.NextStep);
    job.NextDate = i.NextDate;
    job.Url = Clean(i.Url);
    job.Notes = i.Notes;
    job.Location = Clean(i.Location);
    job.CarMin = i.CarMin;
    job.CarMax = i.CarMax;
    job.CarNote = Clean(i.CarNote);
    job.TransitMin = i.TransitMin;
    job.TransitMax = i.TransitMax;
    job.TransitNote = Clean(i.TransitNote);
    job.UpdatedUtc = DateTime.UtcNow;
}

static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
