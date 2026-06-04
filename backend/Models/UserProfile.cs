using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    /// <summary>
    /// Perfil de usuario registrado en la aplicación.
    /// </summary>
    public class UserProfile
    {
        [Key]
        /// <summary>Identificador del usuario.</summary>
        public int Id { get; set; }

        [Required]
        /// <summary>Nombre de usuario o alias.</summary>
        public string Username { get; set; } = string.Empty;

        /// <summary>Marca temporal de creación del perfil.</summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>Total de partidas jugadas por el usuario.</summary>
        public int TotalGamesPlayed { get; set; }
    }
}
