using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class UserProfile
    {
        [Key]
        public Guid Id { get; set; }
        [Required]
        public string Username { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int TotalGamesPlayed { get; set; }
    }
}
