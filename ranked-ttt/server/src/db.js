import pkg from 'pg';
const { Pool } = pkg;


const connectionString = process.env.DATABASE_URL;
export const pool = new Pool({ connectionString });


export async function init() {
await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
}