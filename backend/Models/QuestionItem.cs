namespace backend.Models
{
    public sealed record QuestionItem
    {
        public required int Id { get; init; }
        public required string Question { get; init; }
        public required string Answer { get; init; }
        public IEnumerable<string>? Choices { get; init; }
    }
}