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
      tools: [{
        type: "web_search_preview",
      }],
      input: "Verilen coğrafi işaretli yemek hakkında sadece yemekle ilgili tek paragraflık bir açıklama oluştur. Açıklama, yemeğin tarihi, arka planı, kullanılan malzemeler ve özelliklerini içermeli. Cevap sadece belirtilen dilde olmalı, belirtilen şehir dışında başka bor şehirden bahsetme, fazladan bir giriş veya ek açıklama bulunmamalıdır. Yemek:"+name + ", dil:" + lang + " şehir:" + city
    });
    res.status(200).json({ description: response.output_text });
  } catch (err) {
    console.error("OpenAI hata:", err);
    res.status(500).json({ error: err.message });
  }
}