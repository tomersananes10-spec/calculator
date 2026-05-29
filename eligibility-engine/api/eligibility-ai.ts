const GEMINI_MODEL = 'gemini-2.5-flash'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const { cvText, requirementLabel, requirementDescription, keywords } = req.body
  if (!cvText || !requirementLabel) {
    return res.status(400).json({ error: 'Missing cvText or requirementLabel' })
  }

  const prompt = `אתה מומחה בבדיקת תנאי סף למכרזים ממשלתיים בישראל (תקן כוח מקצועי — תכ"ם).

## משימה
נתח את קורות החיים הבאים וקבע אם המועמד/ת עומד/ת בדרישה הספציפית.

## הדרישה
**${requirementLabel}**
${requirementDescription}

## מילות מפתח רלוונטיות
${keywords.join(', ')}

## קורות החיים
${cvText.slice(0, 8000)}

## הוראות
1. נתח האם המועמד/ת עומד/ת בדרישה זו
2. ציין ראיות ספציפיות מקורות החיים
3. הערך שנות ניסיון רלוונטיות
4. החזר JSON תקין בלבד (ללא markdown, ללא backticks)

## פורמט תשובה (JSON בלבד)
{
  "status": "pass" | "fail" | "requires_review",
  "score": <0-100>,
  "confidence": <0.0-1.0>,
  "estimatedYears": <number>,
  "evidence": ["ראיה 1", "ראיה 2"],
  "reasoning": "הסבר קצר בעברית",
  "missingInfo": "מה חסר כדי לקבוע בוודאות (אם רלוונטי)"
}`

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: 'Gemini API error', details: data })
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return res.status(502).json({ error: 'Empty response from Gemini' })
    }

    try {
      const parsed = JSON.parse(text)
      return res.status(200).json(parsed)
    } catch {
      return res.status(502).json({ error: 'Invalid JSON from Gemini', raw: text })
    }
  } catch {
    return res.status(502).json({ error: 'Failed to reach Gemini API' })
  }
}
