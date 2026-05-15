using backend.Models;

namespace backend.Services
{
    public interface IGameRepository
    {
        QuestionSettings GetSettings();
        IReadOnlyList<QuestionItem> GetQuestions();
        IReadOnlyList<QuestionItem> GetDailyQuestions();
        void RecordGameSession(GameSession session);
        IReadOnlyList<GameSession> GetRecentGameSessions();
        IReadOnlyList<UserProfile> GetUsers();
        UserProfile? GetUserById(Guid id);
    }
}
