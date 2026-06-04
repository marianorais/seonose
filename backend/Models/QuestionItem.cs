using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    /// <summary>
    /// Representa una pregunta del juego.
    /// Propiedades mapeadas a la tabla de preguntas en la BDD.
    /// </summary>
    public class QuestionItem
    {
        [Key]
        /// <summary>Identificador único de la pregunta.</summary>
        public int Id { get; set; }

        [Required]
        /// <summary>Texto de la pregunta.</summary>
        public string Question { get; set; } = string.Empty;

        [Required]
        /// <summary>Respuesta correcta.</summary>
        public string Answer { get; set; } = string.Empty;

        /// <summary>Opciones/alternativas (puede ser null).</summary>
        public string[]? Choices { get; set; }

        /// <summary>Indica si la pregunta está habilitada.</summary>
        public bool Enabled { get; set; } = true;

        /// <summary>Fecha desde la cual la pregunta está disponible.</summary>
        public DateTime AvailableFrom { get; set; }

    }
}