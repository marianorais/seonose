using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class GameAnswer
    {
        [Key]
        public Guid Id { get; set; }
        public Guid GameSessionId { get; set; }
        public int QuestionId { get; set; }
        public string SelectedAnswer { get; set; } = string.Empty;
        public string CorrectAnswer { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
        public int ResponseTime { get; set; }

        public GameSession? GameSession { get; set; }
    }
}
