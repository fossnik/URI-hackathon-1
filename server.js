import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsonrepair } from 'jsonrepair';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if API key is set
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY environment variable is not set!");
  console.log("\nPlease create a .env file with: GEMINI_API_KEY=your_api_key_here");
  process.exit(1);
}

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini AI
const ai = new GoogleGenAI({});

// API endpoint to fetch content from URL
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🌐 Fetching content from URL: ${url}`);

    // Use Node.js native fetch to get the content
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const htmlContent = await response.text();
    
    // Extract text content from HTML
    let textContent = htmlContent;
    
    // Simple HTML tag removal and text extraction
    textContent = textContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
      .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/&nbsp;/g, ' ') // Replace HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    console.log(`✅ Fetched and processed content (${textContent.length} chars) from ${url}`);

    res.json({ 
      success: true, 
      content: textContent,
      url: url,
      length: textContent.length
    });

  } catch (error) {
    console.error('❌ Error fetching URL:', error.message);
    console.error('❌ Error details:', error);
    
    let errorMessage = 'Failed to fetch URL';
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout: The URL took too long to respond. Please try again.';
    } else if (error.message.includes('fetch failed') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Network error: Unable to connect to the URL. Please check if the URL is accessible and try again.';
    } else if (error.message.includes('HTTP error')) {
      errorMessage = `HTTP Error: ${error.message}`;
    } else if (error.message.includes('Invalid URL')) {
      errorMessage = 'Invalid URL format. Please check the URL and try again.';
    } else {
      errorMessage = `Error: ${error.message}`;
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// API endpoint to extract events from text
app.post('/api/extract-events', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`📩 Extracting events from text (${text.length} chars)...`);

    // Limit content size to prevent timeout issues
    const maxLength = 8000; // Limit to 8000 characters
    const processedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    
    if (text.length > maxLength) {
      console.log(`⚠️ Text truncated from ${text.length} to ${processedText.length} chars to prevent timeout`);
    }

    // Get current year for context
    const currentYear = new Date().getFullYear();
    
    // Use Gemini with structured output
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Extract all future events from the following text. The current year is ${currentYear}. If a date is mentioned without a year, assume it's in ${currentYear} or the next occurrence of that date. For each event, identify the title/summary, date and time, and location if available. Return ONLY a JSON array.\n\nText:\n${processedText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "Event title or summary"
              },
              startDateTime: {
                type: "string",
                description: "ISO 8601 date-time string (YYYY-MM-DDTHH:MM:SS)"
              },
              location: {
                type: "string",
                description: "Event location"
              },
              description: {
                type: "string",
                description: "Additional event details"
              }
            },
            required: ["summary", "startDateTime"]
          }
        }
      }
    });

    // Parse the JSON response with robust error handling
    let events;
    try {
      // Clean the response text (remove markdown code blocks if present)
      let cleanedText = response.text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      // Try to repair and parse the JSON
      const repairedJson = jsonrepair(cleanedText);
      events = JSON.parse(repairedJson);
      
      // Ensure it's an array
      if (!Array.isArray(events)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Response text:', response.text);
      return res.status(500).json({ 
        error: 'Failed to parse AI response',
        details: parseError.message 
      });
    }
    
    // Post-process dates to ensure they're in the current year (2025)
    const adjustedEvents = events.map(event => {
      const eventDate = new Date(event.startDateTime);
      
      // Always set to current year (2025) unless it's already in the future
      if (eventDate.getFullYear() !== currentYear) {
        const adjustedDate = new Date(event.startDateTime);
        adjustedDate.setFullYear(currentYear);
        
        event.startDateTime = adjustedDate.toISOString().slice(0, 19);
        console.log(`📅 Set date to current year: ${adjustedDate.toISOString()}`);
      }
      
      return event;
    });
    
    // Add IDs to events
    const eventsWithIds = adjustedEvents.map((event, index) => ({
      ...event,
      id: index + 1
    }));

    console.log(`✅ Extracted ${eventsWithIds.length} events`);

    res.json({ events: eventsWithIds });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log(`📱 Open your browser and visit: http://localhost:${PORT}`);
});
