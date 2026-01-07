import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import texts from './texts.js';

const sql = neon(process.env.DATABASE_URL);

async function setupDatabase() {
  try {
    console.log('Creating texts table...');

    await sql`
      CREATE TABLE IF NOT EXISTS texts (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Texts table created successfully');

    console.log('Creating anonymous_users table...');

    await sql`
      CREATE TABLE IF NOT EXISTS anonymous_users (
        id SERIAL PRIMARY KEY,
        guest_id UUID UNIQUE NOT NULL,
        display_name VARCHAR(50) NOT NULL,
        theme VARCHAR(50) DEFAULT 'rose-pine',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Anonymous users table created successfully');

    console.log('Creating player_stats table...');

    await sql`
      CREATE TABLE IF NOT EXISTS player_stats (
        guest_id UUID PRIMARY KEY REFERENCES anonymous_users(guest_id) ON DELETE CASCADE,
        games_played INT DEFAULT 0,
        games_won INT DEFAULT 0,
        avg_wpm DECIMAL(5,2) DEFAULT 0,
        best_wpm INT DEFAULT 0,
        avg_accuracy DECIMAL(5,2) DEFAULT 0,
        total_characters_typed BIGINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Player stats table created successfully');

    console.log('Creating matches table...');

    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        player1_guest_id UUID REFERENCES anonymous_users(guest_id) ON DELETE SET NULL,
        player2_guest_id UUID REFERENCES anonymous_users(guest_id) ON DELETE SET NULL,
        winner_guest_id UUID REFERENCES anonymous_users(guest_id) ON DELETE SET NULL,
        player1_wpm INT,
        player2_wpm INT,
        player1_accuracy INT,
        player2_accuracy INT,
        player1_time INT,
        player2_time INT,
        text_id INT REFERENCES texts(id),
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Matches table created successfully');

    const existingTexts = await sql`SELECT COUNT(*) FROM texts`;
    const count = parseInt(existingTexts[0].count);

    if (count > 0) {
      console.log(`Database already has ${count} texts, skipping seed`);
      return;
    }

    console.log('Seeding texts...');

    for (const text of texts.entries) {
      await sql`INSERT INTO texts (content) VALUES (${text})`;
    }

    console.log(`Successfully seeded ${texts.length} texts`);

    const allTexts = await sql`SELECT COUNT(*) FROM texts`;
    console.log(`Total texts in database: ${allTexts[0].count}`);

  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }

  process.exit(0);
}

setupDatabase();
