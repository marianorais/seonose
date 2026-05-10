using backend.Models;
using backend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://localhost:5000");

builder.Services.AddSingleton<QuestionRepository>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/api/questions/settings", (QuestionRepository repo) => Results.Ok(repo.GetSettings()));

app.MapGet("/api/questions", (QuestionRepository repo) => Results.Ok(repo.GetDailyQuestions()));

app.MapGet("/api/questions/all", (QuestionRepository repo) => Results.Ok(repo.GetQuestions()));

app.Run();