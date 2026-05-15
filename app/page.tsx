'use client'

import { useState, useRef, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
type Role = 'user' | 'assistant'

interface Message {
  id: string
  role: Role
  content: string
  correction?: {
    hasCorrection: boolean
    original: string
    corrected: string
    points: string[]
    positiveNote: string
    conversational?: string
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [listening, setListening] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recRef    = useRef<unknown>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Send message ─────────────────────────────────────────────────────────────
  async function send(text?: string) {
    const txt = (text ?? input).trim()
    if (!txt || loading) return
    setInput('')
    setLoading(true)

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: txt }
    setMessages(prev => [...prev, userMsg])

    try {
      const history = [...messages, userMsg].slice(-10).map(m => ({
        role: m.role, content: m.content,
      }))

      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = await res.json()

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.corrected || data.conversational || '',
        correction: data,
      }
      setMessages(prev => [...prev, aiMsg])

      // Auto-speak corrected sentence
      if (data.hasCorrection && data.corrected) {
        setTimeout(() => speak(data.corrected), 500)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: '送信に失敗しました。もう一度お試しください。',
      }])
    } finally {
      setLoading(false)
    }
  }

  // ── Speech synthesis ─────────────────────────────────────────────────────────
  function speak(text: string) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'; u.rate = 0.9
    window.speechSynthesis.speak(u)
  }

  // ── Speech recognition ────────────────────────────────────────────────────────
  function toggleMic() {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition as (new () => unknown) | undefined
        || (window as unknown as Record<string, unknown>).webkitSpeechRecognition as (new () => unknown) | undefined
    if (!SR) return alert('このブラウザは音声入力に対応していません')

    if (listening) {
      (recRef.current as { stop: () => void })?.stop()
      setListening(false)
      return
    }

    const rec = new SR() as {
      lang: string; interimResults: boolean
      onresult: (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void
      onerror: () => void; onend: () => void; start: () => void
    }
    rec.lang = 'en-US'; rec.interimResults = false
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false) }
    rec.onerror  = () => setListening(false)
    rec.onend    = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'#f7f4f0', fontFamily:'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ padding:'12px 16px', background:'#faf8f5', borderBottom:'1px solid #ddd4cc', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'#5a8952', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🌸</div>
          <span style={{ fontSize:18, color:'#4f4037' }}>English <span style={{ color:'#5a8952' }}>Bloom</span></span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} title="リセット"
              style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc0b5', fontSize:16, padding:4 }}>↺</button>
          )}
          <span style={{ fontSize:10, color:'#ccc0b5', border:'1px solid #ddd4cc', borderRadius:20, padding:'3px 10px' }}>AI Coach</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 12px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Welcome */}
        {messages.length === 0 && (
          <div style={{ textAlign:'center', padding:'24px 8px' }}>
            <div style={{ fontSize:22, marginBottom:8 }}>🌸</div>
            <p style={{ fontSize:16, color:'#4f4037', margin:'0 0 4px' }}>こんにちは！今日も一緒に英語を磨きましょう</p>
            <p style={{ fontSize:12, color:'#a69080', margin:'0 0 16px' }}>英文を入力すると、優しく丁寧に添削します</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
              {[
                { label:'✉️ メールを書く', text:'I would like to request a meeting with you on next week.' },
                { label:'💬 日常会話',     text:'I am very boring today. What should I do?' },
                { label:'🌸 自己紹介',     text:'Nice to meet you! I am working at a company since 5 years.' },
              ].map(c => (
                <button key={c.label} onClick={() => send(c.text)}
                  style={{ fontSize:12, padding:'6px 14px', borderRadius:20, background:'#eaf0e8', color:'#4d7a46', border:'1px solid #c8d9c4', cursor:'pointer' }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map(msg => (
          <div key={msg.id} style={{ display:'flex', gap:8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems:'flex-start' }}>

            {/* Avatar */}
            <div style={{ width:30, height:30, borderRadius:'50%', background: msg.role === 'user' ? '#b8a99a' : '#5a8952', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0, marginTop:2 }}>
              {msg.role === 'user' ? 'ME' : '✦'}
            </div>

            {/* Bubbles */}
            <div style={{ maxWidth:'82%', display:'flex', flexDirection:'column', gap:6, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>

              {/* User bubble */}
              {msg.role === 'user' && (
                <div style={{ background:'#5a8952', color:'white', borderRadius:'16px 4px 16px 16px', padding:'10px 14px', fontSize:14, lineHeight:1.6 }}>
                  {msg.content}
                </div>
              )}

              {/* AI: correction */}
              {msg.role === 'assistant' && msg.correction && (
                <>
                  {/* Conversational */}
                  {msg.correction.conversational && (
                    <div style={{ background:'#faf8f5', border:'1px solid #ddd4cc', borderRadius:'4px 16px 16px 16px', padding:'10px 14px', fontSize:14, lineHeight:1.6, color:'#4f4037' }}>
                      {msg.correction.conversational}
                    </div>
                  )}

                  {/* Correction intro */}
                  {msg.correction.hasCorrection && (
                    <div style={{ background:'#faf8f5', border:'1px solid #ddd4cc', borderRadius:'4px 16px 16px 16px', padding:'10px 14px', fontSize:14, color:'#4f4037', display:'flex', alignItems:'center', gap:8 }}>
                      <span>こう言うともっと素敵ですよ ✨</span>
                      <button onClick={() => speak(msg.correction!.corrected)}
                        title="読み上げる" style={{ background:'none', border:'none', cursor:'pointer', color:'#6e9a66', fontSize:16, padding:0, lineHeight:1 }}>🔊</button>
                    </div>
                  )}

                  {/* No correction needed */}
                  {!msg.correction.hasCorrection && !msg.correction.conversational && (
                    <div style={{ background:'#faf8f5', border:'1px solid #ddd4cc', borderRadius:'4px 16px 16px 16px', padding:'10px 14px', fontSize:14, color:'#4f4037' }}>
                      完璧です！素晴らしい英文ですね 🌸
                    </div>
                  )}

                  {/* Diff view */}
                  {msg.correction.hasCorrection && (
                    <div style={{ background:'#faf8f5', border:'1px solid #ddd4cc', borderRadius:12, overflow:'hidden', width:'100%' }}>
                      <div style={{ background:'#f7f4f0', padding:'6px 14px', fontSize:10, color:'#a69080', letterSpacing:'0.06em', borderBottom:'1px solid #ddd4cc' }}>
                        ✦ 添削ビュー
                      </div>
                      <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                        <div style={{ background:'#fde8e8', borderLeft:'3px solid #d4908c', borderRadius:6, padding:'6px 10px', fontSize:13, color:'#8b2e2e' }}>
                          <span style={{ fontFamily:'monospace', marginRight:8 }}>−</span>
                          {msg.correction.original}
                        </div>
                        <div style={{ background:'#dff0d8', borderLeft:'3px solid #8cb08c', borderRadius:6, padding:'6px 10px', fontSize:13, color:'#2d6a2d' }}>
                          <span style={{ fontFamily:'monospace', marginRight:8 }}>+</span>
                          {msg.correction.corrected}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Points */}
                  {(msg.correction.points?.length > 0 || msg.correction.positiveNote) && (
                    <div style={{ background:'#faf8f5', border:'1px solid #ddd4cc', borderRadius:12, padding:'12px 14px', width:'100%' }}>
                      {msg.correction.points?.map((p, i) => (
                        <div key={i} style={{ display:'flex', gap:8, fontSize:13, color:'#4f4037', marginBottom:6, lineHeight:1.6 }}>
                          <span style={{ color:'#6e9a66', flexShrink:0 }}>✦</span>
                          <span>{p}</span>
                        </div>
                      ))}
                      {msg.correction.positiveNote && (
                        <div style={{ fontSize:12, color:'#5a8952', fontWeight:500, borderTop:'1px solid #ede8e1', paddingTop:8, marginTop:4 }}>
                          {msg.correction.positiveNote}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* AI: no correction object (fallback) */}
              {msg.role === 'assistant' && !msg.correction && (
                <div style={{ background:'#faf8f5', border:'1px solid #ddd4cc', borderRadius:'4px 16px 16px 16px', padding:'10px 14px', fontSize:14, color:'#4f4037' }}>
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'#5a8952', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>✦</div>
            <div style={{ background:'#faf8f5', border:'1px solid #ddd4cc', borderRadius:'4px 16px 16px 16px', padding:'12px 16px', display:'flex', gap:5, alignItems:'center' }}>
              {[0,150,300].map(d => (
                <span key={d} style={{ width:7, height:7, borderRadius:'50%', background:'#c8d9c4', display:'inline-block',
                  animation:'bounce 1.2s ease infinite', animationDelay:`${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:'10px 12px 16px', background:'#faf8f5', borderTop:'1px solid #ddd4cc', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'flex-end', gap:8, background:'#f7f4f0', border:`1.5px solid ${listening ? '#d4908c' : '#ddd4cc'}`, borderRadius:24, padding:'8px 8px 8px 16px', transition:'border-color 0.2s' }}>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,100)+'px' }}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={listening ? '🎤 聞いています...' : '英文を入力してください...'}
            disabled={loading || listening}
            rows={1}
            style={{ flex:1, background:'transparent', border:'none', outline:'none', resize:'none', fontSize:14, color:'#4f4037', lineHeight:1.5, minHeight:22, maxHeight:100, fontFamily:'system-ui,sans-serif' }}
          />
          <button onClick={toggleMic} title={listening ? '停止' : '音声入力'}
            style={{ width:36, height:36, borderRadius:'50%', background: listening ? '#fde8e8' : '#f7f4f0', border:`1px solid ${listening ? '#d4908c' : '#ddd4cc'}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
            🎤
          </button>
          <button onClick={() => send()} disabled={loading || !input.trim()}
            style={{ width:36, height:36, borderRadius:'50%', background:'#5a8952', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:16, flexShrink:0, opacity: loading || !input.trim() ? 0.4 : 1 }}>
            ➤
          </button>
        </div>
        <p style={{ fontSize:10, textAlign:'center', color:'#ccc0b5', marginTop:6 }}>
          Enter で送信 · Shift+Enter で改行 · 🎤 で音声入力
        </p>
      </div>

      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>
    </div>
  )
}
