using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class SeonoseDbContext : DbContext
    {
        public SeonoseDbContext(DbContextOptions<SeonoseDbContext> options) : base(options) { }

        public DbSet<UserProfile> Users { get; set; }
        public DbSet<GameSession> GameSessions { get; set; }
        public DbSet<GameAnswer> GameAnswers { get; set; }
        public DbSet<QuestionItem> Questions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure relationships
            modelBuilder.Entity<GameSession>()
                .HasOne(gs => gs.User)
                .WithMany()
                .HasForeignKey(gs => gs.UserId);

            modelBuilder.Entity<GameAnswer>()
                .HasOne(ga => ga.GameSession)
                .WithMany(gs => gs.Answers)
                .HasForeignKey(ga => ga.GameSessionId);
        }
    }
}