using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public sealed class QuestionRepository : IGameRepository
    {
        private readonly SeonoseDbContext _context;
        private readonly QuestionSettings _settings;

        private static readonly IReadOnlyList<QuestionItem> DefaultQuestions = new List<QuestionItem>
        {
            new QuestionItem { Id = 1, Question = "¿Cuál es la capital de Francia?", Answer = "París", Choices = new[] { "Londres", "París", "Berlín", "Madrid" } },
            new QuestionItem { Id = 2, Question = "¿Cuántos días tiene una semana?", Answer = "Siete", Choices = new[] { "Cinco", "Siete", "Ocho", "Nueve" } },
            new QuestionItem { Id = 3, Question = "¿En qué continente está Argentina?", Answer = "América" },
            new QuestionItem { Id = 4, Question = "¿Qué planeta es conocido como el planeta rojo?", Answer = "Marte", Choices = new[] { "Venus", "Marte", "Júpiter", "Saturno" } },
            new QuestionItem { Id = 5, Question = "¿Cuál es el color del cielo en un día claro?", Answer = "Azul" },
            new QuestionItem { Id = 6, Question = "¿Cuál es el animal más grande del planeta?", Answer = "Ballena azul", Choices = new[] { "Elefante", "Tiburón blanco", "Ballena azul", "Jirafa" } },
            new QuestionItem { Id = 7, Question = "¿Qué instrumento tiene teclas blancas y negras?", Answer = "Piano" },
            new QuestionItem { Id = 8, Question = "¿Qué líquido bebemos para hidratarnos?", Answer = "Agua" },
            new QuestionItem { Id = 9, Question = "¿Cuál es el río más largo del mundo?", Answer = "Amazonas" },
            new QuestionItem { Id = 10, Question = "¿En qué año terminó la Segunda Guerra Mundial?", Answer = "1945", Choices = new[] { "1945", "1939", "1950", "1940" } },
            new QuestionItem { Id = 11, Question = "¿Cuál es el metal más abundante en la corteza terrestre?", Answer = "Aluminio" },
            new QuestionItem { Id = 12, Question = "¿Qué gas es esencial para la respiración humana?", Answer = "Oxígeno" },
            new QuestionItem { Id = 13, Question = "¿Cuál es la montaña más alta del mundo?", Answer = "Everest" },
            new QuestionItem { Id = 14, Question = "¿Qué océano es el más pequeño?", Answer = "Ártico", Choices = new[] { "Pacífico", "Atlántico", "Índico", "Ártico" } },
            new QuestionItem { Id = 15, Question = "¿Cuál es el país más poblado del mundo?", Answer = "China" },
            new QuestionItem { Id = 16, Question = "¿Qué vitamina se obtiene del sol?", Answer = "Vitamina D" },
            new QuestionItem { Id = 17, Question = "¿Cuál es la capital de Japón?", Answer = "Tokio" },
            new QuestionItem { Id = 18, Question = "¿Qué animal es conocido como el 'Rey de la Selva'?", Answer = "León" }
        };

        public QuestionRepository(SeonoseDbContext context)
        {
            _context = context;
            _settings = new QuestionSettings
            {
                QuestionsPerDay = 5,
                SecondsPerQuestion = 30
            };

            EnsureSeedData();
        }

        private void EnsureSeedData()
        {
            if (!_context.Questions.Any())
            {
                _context.Questions.AddRange(DefaultQuestions);
                _context.SaveChanges();
            }
        }

        public QuestionSettings GetSettings() => _settings;

        public IReadOnlyList<QuestionItem> GetQuestions() => _context.Questions.AsNoTracking().ToList();

        public IReadOnlyList<QuestionItem> GetDailyQuestions()
        {
            var questions = _context.Questions.AsNoTracking().OrderBy(q => q.Id).ToList();
            var start = DateTime.UtcNow.Date.DayOfYear % questions.Count;
            var result = questions.Skip(start).Take(_settings.QuestionsPerDay).ToList();
            if (result.Count < _settings.QuestionsPerDay)
            {
                result.AddRange(questions.Take(_settings.QuestionsPerDay - result.Count));
            }
            return result;
        }

        public void RecordGameSession(GameSession session)
        {
            _context.GameSessions.Add(session);
            _context.SaveChanges();
        }

        public IReadOnlyList<GameSession> GetRecentGameSessions() =>
            _context.GameSessions
                .Include(gs => gs.Answers)
                .AsNoTracking()
                .OrderByDescending(gs => gs.StartedAt)
                .Take(20)
                .ToList();

        public IReadOnlyList<UserProfile> GetUsers() => _context.Users.AsNoTracking().ToList();

        public UserProfile? GetUserById(Guid id) => _context.Users.Find(id);
    }
}
