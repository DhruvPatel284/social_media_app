// Complete seeding code to add to your main.ts
// Place this in an async function in your main.ts

import { DataSource } from 'typeorm';
import { AuthService } from 'src/modules/auth/auth.service';
import { User } from 'src/modules/users/user.entity';
import { Post } from 'src/modules/posts/post.entity';
import { Comment } from 'src/modules/comments/comment.entity';

async function seedDatabase(dataSource: DataSource, authService: AuthService) {
  // ---------------- CLEAR EXISTING DATA ----------------
  console.log('🧹 Clearing existing data...');

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  await dataSource.query('DELETE FROM comment');
  await dataSource.query('DELETE FROM post');
  await dataSource.query('DELETE FROM user');
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

  // ---------------- SAMPLE DATA ----------------
  // ---------------- DATA ----------------
  const usersData = [
    { name: 'Alice Johnson', email: 'alice@example.com' },
    { name: 'Bob Smith', email: 'bob@example.com' },
    { name: 'Charlie Davis', email: 'charlie@example.com' },
    { name: 'Diana Miller', email: 'diana@example.com' },
    { name: 'Ethan Wilson', email: 'ethan@example.com' },
    { name: 'Fiona Brown', email: 'fiona@example.com' },
    { name: 'George Taylor', email: 'george@example.com' },
  ];

  const postContents = [
    "Just finished reading an amazing book about software architecture. The insights on microservices are game-changing!",
    "Coffee and code - the perfect combination for a productive Monday morning ☕",
    "Has anyone tried the new TypeScript 5.0 features? The decorators update is incredible!",
    "Reflecting on my journey as a developer. It's been 5 years since I wrote my first 'Hello World'.",
    "Pro tip: Always write tests before refactoring. Just saved myself hours of debugging!",
    "The sunset today was absolutely breathtaking. Nature never ceases to amaze me 🌅",
    "Started learning GraphQL and I'm already in love with it. REST might have competition!",
    "Debugging a legacy codebase is like archaeology - you never know what you'll find!",
    "Just deployed my first serverless function. The future is here!",
    "Why do we call it 'shipping code' when we're just pushing bits? 🤔",
    "Finally automated my deployment pipeline. CI/CD for the win!",
    "Working remote has its perks, but I miss the office whiteboard sessions.",
    "Just discovered this amazing VS Code extension that changed my workflow completely.",
    "Remember: Code is read more often than it's written. Keep it clean!",
    "Had an amazing brainstorming session with the team today. Innovation at its best!",
    "The best way to learn is to build. Started a new side project this weekend!",
    "Documentation is love. Documentation is life. Write those README files!",
    "Refactored 500 lines into 100. Sometimes less really is more.",
    "Attended an incredible tech conference today. The networking alone was worth it!",
    "There's no such thing as a small bug in production 😅",
    "Just hit 1000 GitHub stars on my open-source project! Thank you community!",
    "Pair programming session was so productive today. Two heads are better than one!",
    "Learning Rust has been challenging but rewarding. The compiler is strict but fair!",
    "Code review tip: Be kind, be constructive, be specific.",
    "Started meditating before coding sessions. The focus improvement is real!",
    "Database optimization reduced our query time by 80%. Performance matters!",
    "The imposter syndrome is real, but so is your progress. Keep going!",
    "Just finished a 48-hour hackathon. Exhausted but exhilarated!",
    "Clean code is not about perfection, it's about clarity and maintainability.",
    "Celebrating small wins today. Progress is progress, no matter how small!",
  ];

  const commentTemplates = [
    "Great post! I completely agree with your perspective.",
    "This is really insightful. Thanks for sharing!",
    "I had a similar experience. It's nice to know I'm not alone.",
    "Could you elaborate more on this? I'd love to learn more.",
    "Totally disagree, but I respect your opinion.",
    "This is exactly what I needed to read today!",
    "Interesting take! I never thought about it that way.",
    "Thanks for the recommendation, I'll check it out!",
    "This reminds me of a project I worked on last year.",
    "Brilliant insight! Saving this for future reference.",
    "I tried this approach and it worked wonders!",
    "Can you share more details about your implementation?",
    "This is gold! Sharing with my team.",
    "I struggled with this too. Your solution is elegant!",
    "Love the way you explained this concept.",
    "Have you considered the edge cases for this?",
    "This is the kind of content we need more of!",
    "Your posts are always so informative. Keep it up!",
    "I'm curious about the performance implications.",
    "This changed my perspective completely.",
    "Absolutely! I've been saying this for years.",
    "Great point, but what about scalability?",
    "This deserves more attention. Underrated post!",
    "I bookmarked this for later. Excellent resource!",
    "Your experience mirrors mine almost exactly.",
    "Thanks for breaking this down so clearly.",
    "This is a hot take, but I'm here for it!",
    "Can't wait to try this out in my project.",
    "You just solved a problem I've been stuck on!",
    "This is why I follow you. Quality content!",
  ];

  // ---------------- HELPERS ----------------
  const getRandomItem = <T>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  try {
    // ---------------- USERS ----------------
    const mockReq = {
      session: {},
    };
    console.log('👤 Creating users...');
    const users: User[] = [];

    for (const userData of usersData) {
      const user = await authService.signup(
        mockReq,
        userData.email,
        'password123',
        userData.name,
      );
      users.push(user);
      console.log(`Created user: ${user.name}`);
    }

    // ---------------- POSTS ----------------
    console.log('📝 Creating posts...');
    const postRepository = dataSource.getRepository(Post);
    const posts: Post[] = [];

    for (let i = 0; i < 28; i++) {
      const post = postRepository.create({
        content: getRandomItem(postContents),
        user: getRandomItem(users),
      });

      await postRepository.save(post);
      posts.push(post);
    }

    // ---------------- COMMENTS ----------------
    console.log('💬 Creating comments...');
    const commentRepository = dataSource.getRepository(Comment);
    let totalComments = 0;

    for (const post of posts) {
      const numberOfComments = getRandomInt(5, 15);

      for (let i = 0; i < numberOfComments; i++) {
        const comment = commentRepository.create({
          comment: getRandomItem(commentTemplates), // ⚠️ must match entity field
          user: getRandomItem(users),
          post: post,
        });

        await commentRepository.save(comment);
        totalComments++;
      }
    }

    // ---------------- SUMMARY ----------------
    console.log('\n=== Seeding Summary ===');
    console.log(`Users: ${users.length}`);
    console.log(`Posts: ${posts.length}`);
    console.log(`Comments: ${totalComments}`);
    console.log('======================\n');
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

// Export the function so you can call it from main.ts
export { seedDatabase };


/* 

  // ---------------- DATA ----------------
  const usersData = [
    { name: 'Alice Johnson', email: 'alice@example.com' },
    { name: 'Bob Smith', email: 'bob@example.com' },
    { name: 'Charlie Davis', email: 'charlie@example.com' },
    { name: 'Diana Miller', email: 'diana@example.com' },
    { name: 'Ethan Wilson', email: 'ethan@example.com' },
    { name: 'Fiona Brown', email: 'fiona@example.com' },
    { name: 'George Taylor', email: 'george@example.com' },
  ];

  const postContents = [
    "Just finished reading an amazing book about software architecture. The insights on microservices are game-changing!",
    "Coffee and code - the perfect combination for a productive Monday morning ☕",
    "Has anyone tried the new TypeScript 5.0 features? The decorators update is incredible!",
    "Reflecting on my journey as a developer. It's been 5 years since I wrote my first 'Hello World'.",
    "Pro tip: Always write tests before refactoring. Just saved myself hours of debugging!",
    "The sunset today was absolutely breathtaking. Nature never ceases to amaze me 🌅",
    "Started learning GraphQL and I'm already in love with it. REST might have competition!",
    "Debugging a legacy codebase is like archaeology - you never know what you'll find!",
    "Just deployed my first serverless function. The future is here!",
    "Why do we call it 'shipping code' when we're just pushing bits? 🤔",
    "Finally automated my deployment pipeline. CI/CD for the win!",
    "Working remote has its perks, but I miss the office whiteboard sessions.",
    "Just discovered this amazing VS Code extension that changed my workflow completely.",
    "Remember: Code is read more often than it's written. Keep it clean!",
    "Had an amazing brainstorming session with the team today. Innovation at its best!",
    "The best way to learn is to build. Started a new side project this weekend!",
    "Documentation is love. Documentation is life. Write those README files!",
    "Refactored 500 lines into 100. Sometimes less really is more.",
    "Attended an incredible tech conference today. The networking alone was worth it!",
    "There's no such thing as a small bug in production 😅",
    "Just hit 1000 GitHub stars on my open-source project! Thank you community!",
    "Pair programming session was so productive today. Two heads are better than one!",
    "Learning Rust has been challenging but rewarding. The compiler is strict but fair!",
    "Code review tip: Be kind, be constructive, be specific.",
    "Started meditating before coding sessions. The focus improvement is real!",
    "Database optimization reduced our query time by 80%. Performance matters!",
    "The imposter syndrome is real, but so is your progress. Keep going!",
    "Just finished a 48-hour hackathon. Exhausted but exhilarated!",
    "Clean code is not about perfection, it's about clarity and maintainability.",
    "Celebrating small wins today. Progress is progress, no matter how small!",
  ];

  const commentTemplates = [
    "Great post! I completely agree with your perspective.",
    "This is really insightful. Thanks for sharing!",
    "I had a similar experience. It's nice to know I'm not alone.",
    "Could you elaborate more on this? I'd love to learn more.",
    "Totally disagree, but I respect your opinion.",
    "This is exactly what I needed to read today!",
    "Interesting take! I never thought about it that way.",
    "Thanks for the recommendation, I'll check it out!",
    "This reminds me of a project I worked on last year.",
    "Brilliant insight! Saving this for future reference.",
    "I tried this approach and it worked wonders!",
    "Can you share more details about your implementation?",
    "This is gold! Sharing with my team.",
    "I struggled with this too. Your solution is elegant!",
    "Love the way you explained this concept.",
    "Have you considered the edge cases for this?",
    "This is the kind of content we need more of!",
    "Your posts are always so informative. Keep it up!",
    "I'm curious about the performance implications.",
    "This changed my perspective completely.",
    "Absolutely! I've been saying this for years.",
    "Great point, but what about scalability?",
    "This deserves more attention. Underrated post!",
    "I bookmarked this for later. Excellent resource!",
    "Your experience mirrors mine almost exactly.",
    "Thanks for breaking this down so clearly.",
    "This is a hot take, but I'm here for it!",
    "Can't wait to try this out in my project.",
    "You just solved a problem I've been stuck on!",
    "This is why I follow you. Quality content!",
  ];


*/
