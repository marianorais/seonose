using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class QuestionItem
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string Question { get; set; } = string.Empty;
        [Required]
        public string Answer { get; set; } = string.Empty;
        public string[]? Choices { get; set; }
    }
}