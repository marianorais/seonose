using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    /// <summary>
    /// Representa una sesión de juego completada o en curso.
    /// </summary>
    public class GameSession
    {
        [Key]
        /// <summary>Identificador de la sesión.</summary>
        public int Id { get; set; }

        /// <summary>Identificador de usuario (si aplica).</summary>
        public int? UserId { get; set; }

        /// <summary>Fecha/hora de inicio de la sesión.</summary>
        public DateTime StartedAt { get; set; }

        /// <summary>Fecha/hora de finalización (si fue completada).</summary>
        public DateTime? CompletedAt { get; set; }

        /// <summary>Total de preguntas en la sesión.</summary>
        public int TotalQuestions { get; set; }

        /// <summary>Cantidad de respuestas correctas.</summary>
        public int CorrectAnswers { get; set; }

        /// <summary>URL compartible con resultados (opcional).</summary>
        public string? ShareUrl { get; set; }

        public UserProfile? User { get; set; }
        public ICollection<GameAnswer> Answers { get; set; } = new List<GameAnswer>();
    }
}
