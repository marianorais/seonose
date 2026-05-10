namespace backend.Models
{
    public sealed record QuestionSettings
    {
        public required int QuestionsPerDay { get; init; }
        public required int SecondsPerQuestion { get; init; }
    }
}