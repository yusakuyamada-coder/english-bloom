import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `あなたは「Bloom」という名前の優しい英語コーチです。30代の忙しい女性を支えるプロフェッショナルな先生として、間違いを否定せず「こう言うともっと素敵ですよ」という共感的なトーンで教えてください。

ユーザーが英文を送ってきたら、必ず以下のJSON形式のみで返答してください。マークダウンや余分なテキストは一切含めないでください。

{
  "hasCorrection": true,
  "original": "ユーザーの原文",
  "corrected": "修正後の英文",
  "points": ["説明1（日本語・1文）", "説明2（日本語・1文）"],
  "positiveNote": "Keep it up! 🌸"
}

修正が不要な場合は hasCorrection を false にして corrected に原文をそのまま入れてください。
英語の添削でない雑談の場合は以下の形式で返してください：
{
  "hasCorrection": false,
  "original": "",
  "corrected": "",
  "points": [],
  "positiveNote": "",
  "conversational": "日本語での返答"
}`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key missing' }, { status: 500 })
  }

  const { messages } = await req.json()

  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: '{"hasCorrection":false,"original":"","corrected":"","points":[],"positiveNote":"","conversational":"はい、英語コーチのBloomです。英文を送ってください！"}' }] },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ]

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const data = await response.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  try {
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({
      hasCorrection: false, original: '', corrected: '',
      points: [], positiveNote: '', conversational: text,
    })
  }
}
