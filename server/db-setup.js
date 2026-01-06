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
