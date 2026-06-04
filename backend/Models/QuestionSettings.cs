namespace backend.Models
{
    /// <summary>
    /// Configuración del juego relacionada con preguntas y tiempos.
    /// </summary>
    public sealed record QuestionSettings
    {
        /// <summary>Número de preguntas por día.</summary>
        public required int QuestionsPerDay { get; init; }

        /// <summary>Segundos permitidos por pregunta.</summary>
        public required int SecondsPerQuestion { get; init; }
    }
}