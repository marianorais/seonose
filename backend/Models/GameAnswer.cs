using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    /// <summary>
    /// Respuesta seleccionada por el usuario dentro de una sesión de juego.
    /// </summary>
    public class GameAnswer
    {
        [Key]
        /// <summary>Identificador de la respuesta.</summary>
        public int Id { get; set; }

        /// <summary>Identificador de la sesión de juego asociada.</summary>
        public int GameSessionId { get; set; }

        /// <summary>Identificador de la pregunta asociada.</summary>
        public int QuestionId { get; set; }

        /// <summary>Respuesta escogida por el jugador.</summary>
        public string SelectedAnswer { get; set; } = string.Empty;

        /// <summary>Respuesta correcta.</summary>
        public string CorrectAnswer { get; set; } = string.Empty;

        /// <summary>Indicador de si la respuesta fue correcta.</summary>
        public bool IsCorrect { get; set; }

        /// <summary>Tiempo de respuesta en segundos.</summary>
        public int ResponseTime { get; set; }

        public GameSession? GameSession { get; set; }
        public QuestionItem? Question { get; set; }
    }
}
