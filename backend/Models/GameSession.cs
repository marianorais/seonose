using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class GameSession
    {
        [Key]
        public Guid Id { get; set; }
        public Guid? UserId { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int TotalQuestions { get; set; }
        public int CorrectAnswers { get; set; }
        public string? ShareUrl { get; set; }

        public UserProfile? User { get; set; }
        public ICollection<GameAnswer> Answers { get; set; } = new List<GameAnswer>();
    }
}
