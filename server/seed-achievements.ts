import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Define types used in this file
interface User {
  id: number;
  email: string;
  name: string;
  [key: string]: any;
}

/**
 * Seeds some sample achievements for the existing users
 */
async function seedAchievements() {
  neonConfig.webSocketConstructor = ws;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Seeding sample achievements...");
    
    // Get users to create achievements for
    const { rows: users } = await pool.query<User>("SELECT * FROM users LIMIT 5");
    
    if (users.length === 0) {
      console.log("No users found to create achievements for. Please run seed.ts first.");
      return { success: false, message: "No users found" };
    }
    
    // Sample achievement data
    const achievementTypes = [
      'tasks_completed', 
      'customer_health_improved', 
      'feedback_collected', 
      'playbooks_executed', 
      'red_zone_resolved', 
      'login_streak'
    ];
    
    const achievementTitles = {
      'tasks_completed': ['Task Master', 'Completion Champion', 'To-Do Terminator'],
      'customer_health_improved': ['Health Guru', 'Recovery Specialist', 'Success Doctor'],
      'feedback_collected': ['Feedback Hunter', 'Voice of the Customer', 'Insight Collector'],
      'playbooks_executed': ['Playbook Pro', 'Workflow Wizard', 'Process Champion'],
      'red_zone_resolved': ['Red Zone Resolver', 'Rescue Ranger', 'Crisis Controller'],
      'login_streak': ['Loyal Logger', 'Consistent Connector', 'Dedicated User']
    };
    
    const achievementDescriptions = {
      'tasks_completed': ['Completed 10 tasks', 'Completed 25 tasks', 'Completed 50 tasks'],
      'customer_health_improved': ['Improved 5 customer health scores', 'Turned 10 at-risk accounts healthy', 'No customers in red zone for a month'],
      'feedback_collected': ['Collected feedback from 5 customers', 'Achieved 90% feedback completion rate', 'Collected 20 pieces of feedback'],
      'playbooks_executed': ['Executed 5 playbooks successfully', 'Completed the onboarding playbook in record time', 'Used all available playbooks'],
      'red_zone_resolved': ['Resolved 3 red zone situations', 'Improved a critical account to healthy', 'Prevented 5 accounts from entering red zone'],
      'login_streak': ['Logged in for 5 consecutive days', 'Completed a 2-week login streak', 'Maintained a 30-day activity streak']
    };
    
    const badgeIcons = {
      'tasks_completed': 'trophy',
      'customer_health_improved': 'zap',
      'feedback_collected': 'star',
      'playbooks_executed': 'award',
      'red_zone_resolved': 'clock',
      'login_streak': 'user'
    };
    
    // Generate 15 random achievements (3 per user if we have 5 users)
    for (let i = 0; i < users.length; i++) {
      const userId = users[i].id;
      
      // Each user gets 3 achievements
      for (let j = 0; j < 3; j++) {
        // Random achievement type for diverse data
        const achievementType = achievementTypes[Math.floor(Math.random() * achievementTypes.length)];
        
        // For each achievement type, randomly select a title and description
        const titles = achievementTitles[achievementType as keyof typeof achievementTitles];
        const descriptions = achievementDescriptions[achievementType as keyof typeof achievementDescriptions];
        
        const title = titles[Math.floor(Math.random() * titles.length)];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];
        const badgeIcon = badgeIcons[achievementType as keyof typeof badgeIcons];
        
        // Random XP between 50 and 500
        const xpEarned = Math.floor(Math.random() * 450) + 50;
        
        // 80% chance to have viewed the achievement
        const isViewed = Math.random() > 0.2;
        
        // Create achievement with a date in the last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        const earnedAt = new Date();
        earnedAt.setDate(earnedAt.getDate() - daysAgo);
        
        // Sometimes set a level unlock (20% chance)
        const levelUnlocked = Math.random() > 0.8 ? Math.floor(Math.random() * 5) + 1 : null;
        
        // Insert the achievement
        await pool.query(`
          INSERT INTO user_achievements (
            user_id, 
            achievement_type, 
            achievement_title, 
            achievement_description, 
            badge_icon, 
            xp_earned, 
            level_unlocked, 
            earned_at, 
            is_viewed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          userId,
          achievementType,
          title,
          description,
          badgeIcon,
          xpEarned,
          levelUnlocked,
          earnedAt.toISOString(),
          isViewed
        ]);
      }
    }
    
    console.log(`Successfully created ${users.length * 3} sample achievements!`);
    return { success: true };
  } catch (error) {
    console.error("Error seeding achievements:", error);
    return { success: false, error };
  } finally {
    await pool.end();
  }
}

export default seedAchievements;