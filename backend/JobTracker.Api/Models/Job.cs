namespace JobTracker.Api.Models;

public enum JobStatus
{
    Wishlist,
    Applied,
    Interviewing,
    Offer,
    Rejected,
    Withdrawn
}

public class Job
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public JobStatus Status { get; set; } = JobStatus.Applied;
    public DateOnly? Applied { get; set; }
    public string? NextStep { get; set; }
    public DateOnly? NextDate { get; set; }
    public string? Url { get; set; }
    public string? Notes { get; set; }

    // Commute (from home), in minutes
    public string? Location { get; set; }
    public int? CarMin { get; set; }
    public int? CarMax { get; set; }
    public string? CarNote { get; set; }
    public int? TransitMin { get; set; }
    public int? TransitMax { get; set; }
    public string? TransitNote { get; set; }

    public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
}

/// <summary>What the client sends when creating or editing a job.</summary>
public record JobInput(
    string? Company,
    string? Role,
    JobStatus Status,
    DateOnly? Applied,
    string? NextStep,
    DateOnly? NextDate,
    string? Url,
    string? Notes,
    string? Location,
    int? CarMin,
    int? CarMax,
    string? CarNote,
    int? TransitMin,
    int? TransitMax,
    string? TransitNote);

/// <summary>Single-row table with app-wide settings.</summary>
public class AppSettings
{
    public int Id { get; set; } = 1;
    public string LeaveFrom { get; set; } = "08:00";
    public string LeaveTo { get; set; } = "09:00";
}

public record SettingsInput(string LeaveFrom, string LeaveTo);
