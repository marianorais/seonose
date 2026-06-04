using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    /// <summary>
    /// Repositorio que expone métodos para acceder a preguntas, sesiones y usuarios.
    /// Implementa <see cref="IGameRepository"/>.
    /// </summary>
    public sealed class QuestionRepository : IGameRepository
    {
        private readonly SeonoseDbContext _context;
        private readonly QuestionSettings _settings;

        // Preguntas por defecto usadas como seed si la BDD está vacía.
        private static readonly IReadOnlyList<QuestionItem> DefaultQuestions = new List<QuestionItem>
        {
            new QuestionItem { Id = 1, Question = "¿Cuál es la capital de Nigeria?", Answer = "Abuya", Choices = new[] { "Lagos", "Abuya", "Kano", "Accra" } },
            new QuestionItem { Id = 2, Question = "¿En qué año terminó la Segunda Guerra Mundial?", Answer = "1945", Choices = new[] { "1945", "1939", "1950", "1940" } },
            new QuestionItem { Id = 3, Question = "¿Cuál es el metal más abundante en la corteza terrestre?", Answer = "Aluminio", Choices = new[] { "Hierro", "Cobre", "Aluminio", "Plata" } },
            new QuestionItem { Id = 4, Question = "¿Qué océano es el más pequeño?", Answer = "Ártico", Choices = new[] { "Pacífico", "Atlántico", "Índico", "Ártico" } },
            new QuestionItem { Id = 5, Question = "¿Qué vitamina se obtiene principalmente del sol?", Answer = "Vitamina D", Choices = new[] { "Vitamina C", "Vitamina B12", "Vitamina D", "Vitamina A" } },

            new QuestionItem { Id = 6, Question = "¿Qué científico formuló la teoría de la relatividad general?", Answer = "Albert Einstein", Choices = new[] { "Isaac Newton", "Nikola Tesla", "Albert Einstein", "Galileo Galilei" } },
            new QuestionItem { Id = 7, Question = "¿Cuál es el elemento químico con símbolo 'W'?", Answer = "Wolframio", Choices = new[] { "Titanio", "Wolframio", "Platino", "Mercurio" } },
            new QuestionItem { Id = 8, Question = "¿En qué año cayó el Imperio Romano de Occidente?", Answer = "476", Choices = new[] { "410", "1453", "476", "509" } },
            new QuestionItem { Id = 9, Question = "¿Qué país ganó el Mundial de fútbol de 2010?", Answer = "España", Choices = new[] { "Alemania", "Argentina", "España", "Brasil" } },
            new QuestionItem { Id = 10, Question = "¿Qué matemático desarrolló el cálculo diferencial junto con Leibniz?", Answer = "Isaac Newton", Choices = new[] { "Pitágoras", "Isaac Newton", "Euler", "Descartes" } },
            new QuestionItem { Id = 11, Question = "¿Qué lenguaje se utiliza principalmente para desarrollar Android nativo?", Answer = "Kotlin", Choices = new[] { "Swift", "JavaScript", "Kotlin", "Ruby" } },
            new QuestionItem { Id = 12, Question = "¿Cuál es el hueso más largo del cuerpo humano?", Answer = "Fémur", Choices = new[] { "Tibia", "Húmero", "Fémur", "Radio" } },
            new QuestionItem { Id = 13, Question = "¿Qué civilización construyó Machu Picchu?", Answer = "Inca", Choices = new[] { "Maya", "Azteca", "Inca", "Romana" } },
            new QuestionItem { Id = 14, Question = "¿Cuál es la velocidad aproximada de la luz?", Answer = "300000 km/s", Choices = new[] { "150000 km/s", "300000 km/s", "100000 km/s", "500000 km/s" } },
            new QuestionItem { Id = 15, Question = "¿Qué planeta tiene más lunas conocidas?", Answer = "Saturno", Choices = new[] { "Júpiter", "Marte", "Saturno", "Neptuno" } },
            new QuestionItem { Id = 16, Question = "¿Quién escribió 'Cien años de soledad'?", Answer = "Gabriel García Márquez", Choices = new[] { "Mario Vargas Llosa", "Pablo Neruda", "Gabriel García Márquez", "Julio Cortázar" } },
            new QuestionItem { Id = 17, Question = "¿Qué estructura celular contiene el ADN?", Answer = "Núcleo", Choices = new[] { "Mitocondria", "Núcleo", "Ribosoma", "Citoplasma" } },
            new QuestionItem { Id = 18, Question = "¿Cuál es el país más grande del mundo?", Answer = "Rusia", Choices = new[] { "Canadá", "China", "Estados Unidos", "Rusia" } },
            new QuestionItem { Id = 19, Question = "¿Qué filósofo dijo 'Pienso, luego existo'?", Answer = "René Descartes", Choices = new[] { "Platón", "Aristóteles", "René Descartes", "Nietzsche" } },
            new QuestionItem { Id = 20, Question = "¿Qué país tiene más husos horarios?", Answer = "Francia", Choices = new[] { "Rusia", "Estados Unidos", "China", "Francia" } },
            new QuestionItem { Id = 21, Question = "¿Cuál es la moneda oficial de Suiza?", Answer = "Franco suizo", Choices = new[] { "Euro", "Corona", "Franco suizo", "Libra" } },
            new QuestionItem { Id = 22, Question = "¿Qué científico descubrió la penicilina?", Answer = "Alexander Fleming", Choices = new[] { "Louis Pasteur", "Alexander Fleming", "Darwin", "Bohr" } },
            new QuestionItem { Id = 23, Question = "¿Cuál es el país con mayor cantidad de volcanes activos?", Answer = "Indonesia", Choices = new[] { "Japón", "Chile", "Indonesia", "México" } },
            new QuestionItem { Id = 24, Question = "¿Qué físico propuso las leyes del movimiento?", Answer = "Isaac Newton", Choices = new[] { "Albert Einstein", "Isaac Newton", "Stephen Hawking", "Niels Bohr" } },
            new QuestionItem { Id = 25, Question = "¿Cuál es el órgano más grande del cuerpo humano?", Answer = "La piel", Choices = new[] { "El hígado", "El corazón", "La piel", "Los pulmones" } },
            new QuestionItem { Id = 26, Question = "¿Cuál es la capital de Kazajistán?", Answer = "Astaná", Choices = new[] { "Taskent", "Bakú", "Astaná", "Dusambé" } },
            new QuestionItem { Id = 27, Question = "¿Qué planeta tarda más tiempo en dar una vuelta al Sol?", Answer = "Neptuno", Choices = new[] { "Saturno", "Urano", "Neptuno", "Júpiter" } },
            new QuestionItem { Id = 28, Question = "¿Cuál es el idioma más hablado del mundo por hablantes nativos?", Answer = "Chino mandarín", Choices = new[] { "Inglés", "Español", "Hindi", "Chino mandarín" } },
            new QuestionItem { Id = 29, Question = "¿Qué científico desarrolló la teoría de la evolución?", Answer = "Charles Darwin", Choices = new[] { "Gregor Mendel", "Charles Darwin", "Louis Pasteur", "Copérnico" } },
            new QuestionItem { Id = 30, Question = "¿Qué país tiene la ciudad más poblada del mundo?", Answer = "Japón", Choices = new[] { "China", "India", "Estados Unidos", "Japón" } },
            new QuestionItem { Id = 31, Question = "¿Cuál es el único mamífero capaz de volar?", Answer = "Murciélago", Choices = new[] { "Ardilla voladora", "Murciélago", "Cóndor", "Planeador del azúcar" } },
            new QuestionItem { Id = 32, Question = "¿Qué país inventó el papel?", Answer = "China", Choices = new[] { "Egipto", "Grecia", "China", "India" } },
            new QuestionItem { Id = 33, Question = "¿Cuál es el océano más profundo del planeta?", Answer = "Pacífico", Choices = new[] { "Atlántico", "Índico", "Ártico", "Pacífico" } },
            new QuestionItem { Id = 34, Question = "¿Qué elemento químico tiene el número atómico 79?", Answer = "Oro", Choices = new[] { "Plata", "Cobre", "Oro", "Mercurio" } },
            new QuestionItem { Id = 35, Question = "¿Qué país tiene forma de bota?", Answer = "Italia", Choices = new[] { "Grecia", "Portugal", "Italia", "Croacia" } },
        };

        public QuestionRepository(SeonoseDbContext context)
        {
            _context = context;
            _settings = new QuestionSettings
            {
                QuestionsPerDay = 5,
                SecondsPerQuestion = 30
            };

            // Asegura datos iniciales si la BD no contiene preguntas.
            EnsureSeedData();
        }

        /// <summary>
        /// Inserta preguntas por defecto si la tabla está vacía.
        /// </summary>
        private void EnsureSeedData()
        {
            if (!_context.Questions.Any())
            {
                _context.Questions.AddRange(DefaultQuestions);
                _context.SaveChanges();
            }
        }

        /// <inheritdoc/>
        public QuestionSettings GetSettings() => _settings;

        /// <inheritdoc/>
        public IReadOnlyList<QuestionItem> GetQuestions() => _context.Questions.AsNoTracking().ToList();

        /// <inheritdoc/>
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

        /// <inheritdoc/>
        public void RecordGameSession(GameSession session)
        {
            _context.GameSessions.Add(session);
            _context.SaveChanges();
        }

        /// <inheritdoc/>
        public IReadOnlyList<GameSession> GetRecentGameSessions() =>
            _context.GameSessions
                .Include(gs => gs.Answers)
                .AsNoTracking()
                .OrderByDescending(gs => gs.StartedAt)
                .Take(20)
                .ToList();

        /// <inheritdoc/>
        public IReadOnlyList<UserProfile> GetUsers() => _context.Users.AsNoTracking().ToList();

        /// <inheritdoc/>
        public UserProfile? GetUserById(Guid id) => _context.Users.Find(id);
    }
}
