using backend.Models;

namespace backend.Services
{
    public sealed class QuestionRepository
    {
        private readonly QuestionSettings _settings;
        private readonly IReadOnlyList<QuestionItem> _questions;

        public QuestionRepository()
        {
            _settings = new QuestionSettings
            {
                QuestionsPerDay = 5,
                SecondsPerQuestion = 30
            };

            _questions = new List<QuestionItem>
            {
                new QuestionItem
                {
                    Id = 1,
                    Question = "¿Cuál es la capital de Francia?",
                    Answer = "París",
                    Choices = new[] { "Londres", "París", "Berlín", "Madrid" }
                },
                new QuestionItem
                {
                    Id = 2,
                    Question = "¿Cuántos días tiene una semana?",
                    Answer = "Siete",
                    Choices = new[] { "Cinco", "Siete", "Ocho", "Nueve" }
                },
                new QuestionItem
                {
                    Id = 3,
                    Question = "¿En qué continente está Argentina?",
                    Answer = "América"
                },
                new QuestionItem
                {
                    Id = 4,
                    Question = "¿Qué planeta es conocido como el planeta rojo?",
                    Answer = "Marte",
                    Choices = new[] { "Venus", "Marte", "Júpiter", "Saturno" }
                },
                new QuestionItem
                {
                    Id = 5,
                    Question = "¿Cuál es el color del cielo en un día claro?",
                    Answer = "Azul"
                },
                new QuestionItem
                {
                    Id = 6,
                    Question = "¿Cuál es el animal más grande del planeta?",
                    Answer = "Ballena azul",
                    Choices = new[] { "Elefante", "Tiburón blanco", "Ballena azul", "Jirafa" }
                },
                new QuestionItem
                {
                    Id = 7,
                    Question = "¿Qué instrumento tiene teclas blancas y negras?",
                    Answer = "Piano"
                },
                new QuestionItem
                {
                    Id = 8,
                    Question = "¿Qué líquido bebemos para hidratarnos?",
                    Answer = "Agua"
                }
            };
        }

        public QuestionSettings GetSettings() => _settings;

        public IReadOnlyList<QuestionItem> GetQuestions() => _questions;

        public IReadOnlyList<QuestionItem> GetDailyQuestions()
        {
            var dayIndex = DateTime.UtcNow.Date.DayOfYear;
            var ordered = _questions.OrderBy(q => q.Id).ToList();
            return ordered.Skip(dayIndex % ordered.Count).Take(_settings.QuestionsPerDay).ToList();
        }
    }
}