import axios from 'axios';
import { getPool, closePool } from '../src/config/db.js';
import { getChatCompletion } from '../src/services/ai.service.js';

// Clean HTML to raw structural text
function cleanHtml(html) {
  let text = html;
  
  // Remove scripts, styles, header, footer, nav
  text = text.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
  text = text.replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '');
  text = text.replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '');
  text = text.replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, '');
  
  // Replace list items, paragraphs, headings and divs with newlines
  text = text.replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>|<\/tr>/gi, '\n');
  text = text.replace(/<br[^>]*>/gi, '\n');
  
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&amp;/g, '&')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'")
             .replace(/&middot;/g, '•');

  // Collapse multiple spaces and lines
  text = text.split('\n')
             .map(line => line.trim())
             .filter(line => line.length > 0)
             .join('\n');
             
  return text;
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node scripts/crawl_and_extract.mjs <url>');
    process.exit(1);
  }

  console.log(`[Crawler] Fetching URL: ${url}`);
  let html;
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });
    html = response.data;
  } catch (error) {
    console.error(`[Crawler] Failed to fetch URL: ${error.message}`);
    process.exit(1);
  }

  console.log('[Crawler] Sanitizing content...');
  const cleanedText = cleanHtml(html);
  
  // Limit text size to prevent exceeding token limits (approx 8000 characters)
  const truncatedText = cleanedText.slice(0, 8000);
  console.log(`[Crawler] Extracted ${cleanedText.length} characters (truncated to ${truncatedText.length}).`);

  console.log('[AI] Sending text to AI for structured wiki extraction...');
  
  const systemPrompt = `You are a professional assistant that extracts structured knowledge entries for a pet feeder chatbot wiki from crawled web text.
Analyze the provided text and extract relevant, high-quality QA or knowledge entries about dog/cat nutrition, feeding schedules, device configurations (Wi-Fi, calibration), overeating signs, food toxicity, and health symptoms.

For each entry, you must provide:
1. "keyword": A short, lowercase Vietnamese search phrase/word (e.g. "thịt gà", "chó con 3 tháng", "ăn quá nhiều", "tiêu chảy"). The keyword should match what a user might type or ask about. It must be unique.
2. "content": A concise, clear Vietnamese definition or guide.
   - For health, ngộ độc (poisoning), or danger symptoms (like diarrhea, vomiting, bloat), you MUST provide a brief advice and conclude with a STRICT MANDATORY warning/recommendation that the user must take their pet to the vet immediately (e.g. "LƯU Ý BẮT BUỘC: Hãy đưa bé đi thú y ngay lập tức...").

Format the output strictly as a JSON array of objects:
[
  {
    "keyword": "...",
    "content": "..."
  }
]
Do not include any Markdown packaging or extra conversational text. Return only the raw JSON.`;

  let aiResponse;
  try {
    aiResponse = await getChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Please extract wiki entries from this text:\n\n${truncatedText}` }
      ],
      temperature: 0.2
    });
  } catch (error) {
    console.error(`[AI] Failed to call AI service: ${error.message}`);
    process.exit(1);
  }

  const rawContent = aiResponse.content?.trim();
  if (!rawContent) {
    console.error('[AI] AI response was empty.');
    process.exit(1);
  }

  // Clean Markdown JSON wrapper if present
  let jsonString = rawContent;
  if (jsonString.startsWith('```json')) {
    jsonString = jsonString.slice(7);
  } else if (jsonString.startsWith('```')) {
    jsonString = jsonString.slice(3);
  }
  if (jsonString.endsWith('```')) {
    jsonString = jsonString.slice(0, -3);
  }
  jsonString = jsonString.trim();

  let entries;
  try {
    entries = JSON.parse(jsonString);
  } catch (error) {
    console.error('[AI] Failed to parse JSON from AI response.');
    console.error('Raw Response:', rawContent);
    process.exit(1);
  }

  if (!Array.isArray(entries)) {
    console.error('[AI] AI response is not a JSON array.');
    process.exit(1);
  }

  console.log(`[Crawler] Extracted ${entries.length} entries. Saving to database...`);
  
  const pool = getPool();
  let inserted = 0;
  let updated = 0;

  try {
    for (const entry of entries) {
      const { keyword, content } = entry;
      if (!keyword || !content) continue;

      const normalizedKeyword = keyword.toLowerCase().trim();

      // Check if keyword exists
      const [dupes] = await pool.execute(
        'SELECT id, content FROM chatbot_wiki WHERE keyword = ? LIMIT 1',
        [normalizedKeyword]
      );

      if (dupes.length > 0) {
        if (dupes[0].content !== content) {
          await pool.execute(
            'UPDATE chatbot_wiki SET content = ?, updated_at = NOW() WHERE id = ?',
            [content, dupes[0].id]
          );
          updated++;
        }
      } else {
        await pool.execute(
          'INSERT INTO chatbot_wiki (keyword, content, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          [normalizedKeyword, content]
        );
        inserted++;
      }
    }
    console.log(`[Database] Success! Inserted: ${inserted}, Updated: ${updated}`);
  } catch (error) {
    console.error(`[Database] Error saving entries: ${error.message}`);
  } finally {
    await closePool();
  }
}

main().catch(err => {
  console.error('[Crawler] Fatal error:', err);
  process.exit(1);
});
