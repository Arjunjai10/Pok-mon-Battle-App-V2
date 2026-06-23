import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'server', 'data', 'pokemon.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return new Response(fileContents, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
