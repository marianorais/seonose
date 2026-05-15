using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://localhost:5000");

builder.Services.AddDbContext<SeonoseDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=seonose.db"));
builder.Services.AddScoped<IGameRepository, QuestionRepository>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SeonoseDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/api/questions/settings", (IGameRepository repo) => Results.Ok(repo.GetSettings()));

app.MapGet("/api/questions", (IGameRepository repo) => Results.Ok(repo.GetDailyQuestions()));

app.MapGet("/api/questions/all", (IGameRepository repo) => Results.Ok(repo.GetQuestions()));

app.MapPost("/api/games", (IGameRepository repo, GameSession session) =>
{
    session.Id = Guid.NewGuid();
    session.StartedAt = DateTime.UtcNow;
    if (session.Answers != null)
    {
        foreach (var answer in session.Answers)
        {
            answer.Id = Guid.NewGuid();
            answer.GameSessionId = session.Id;
        }
    }
    repo.RecordGameSession(session);
    return Results.Created($"/api/games/{session.Id}", session);
});

app.MapGet("/api/games/recent", (IGameRepository repo) => Results.Ok(repo.GetRecentGameSessions()));
app.MapGet("/api/users", (IGameRepository repo) => Results.Ok(repo.GetUsers()));

app.Run();