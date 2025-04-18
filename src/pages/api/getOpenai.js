import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_OPENAI_API_KEY 
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }
  const { name, lang, city} = req.body;
  if (!name) {
    return res.status(400).json({ error: "Missing name" });
  }

  try {
    const response = await openai.responses.create({
    model: "gpt-4.1",
    input: [
      {
        "role": "system",
        "content": [
          {
            "type": "input_text",
            "text": "Write a single-paragraph explanation about the given geographically marked Turkish dish, including its history, background, ingredients, and features. The explanation must be in the specified language, solely about the specified city, without mentioning other cities, extra introductions, or additional explanations."
          }
        ]
      },
      {
        "role": "user",
        "content": [
          {
            "type": "input_text",
            "text": "dish name: " + name + ", city: " + city + ", language: " + lang
          }
        ]
      }
    ],
    text: {
      "format": {
        "type": "text"
      }
    },
    tools: [
      {
        "type": "web_search_preview",
        "user_location": {
          "type": "approximate",
          "country": "TR",
          "region": city,
          "city": city
        },
        "search_context_size": "medium"
      }
    ],
    temperature: 1,
    max_output_tokens: 2048,
    top_p: 1,
  });
    res.status(200).json({ description: response.output_text });
  } catch (err) {
    console.error("OpenAI hata:", err);
    res.status(500).json({ error: err.message });
  }
}