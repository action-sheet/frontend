import { useState } from 'react'

/**
 * EmailResponse — Standalone page that processes email response clicks.
 *
 * SECURITY FIX (v2.1):
 * Previously auto-submitted on page load, which allowed Microsoft ATP and
 * Google email scanners to trigger phantom responses by executing the SPA JS.
 *
 * Now shows a CONFIRMATION screen first — the user must click a button
 * to submit their response. Scanners won't interact with buttons.
 *
 * URL format: /respond?sheet=XX&email=XX&response=XX&token=XX
 */

const API_BASE = import.meta.env.VITE_API_URL || ''

type Status = 'confirm' | 'loading' | 'success' | 'already' | 'info' | 'error' | 'invalid'

interface ResponseResult {
  status: Status
  title: string
  message: string
  color: string
  response?: string
  sheetId?: string
}

export default function EmailResponse() {
  const params = new URLSearchParams(window.location.search)
  const sheet = params.get('sheet')
  const email = params.get('email')
  const response = params.get('response')
  const token = params.get('token')

  // Determine if params are valid
  const isValid = !!(sheet && email && response && token)

  const [result, setResult] = useState<ResponseResult>(
    isValid
      ? {
          status: 'confirm',
          title: 'Confirm Your Response',
          message: `You are about to respond to this action sheet.`,
          color: '#800000',
          response: response!,
          sheetId: sheet!,
        }
      : {
          status: 'invalid',
          title: '⚠️ Invalid Link',
          message: 'This response link is missing required parameters.',
          color: '#e65100',
        }
  )

  // Only called when user clicks the confirm button — NOT on page load
  async function submitResponse() {
    setResult({
      status: 'loading',
      title: 'Processing Your Response',
      message: 'Please wait...',
      color: '#800000',
    })

    try {
      const apiUrl = `${API_BASE}/api/respond/process?` + new URLSearchParams({
        sheet: sheet!,
        email: email!,
        response: response!,
        token: token!,
      }).toString()

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'text/html,application/json',
        },
      })

      const html = await res.text()

      if (html.includes('Already Responded') || html.includes('already responded')) {
        setResult({
          status: 'already',
          title: 'ℹ️ Already Responded',
          message: extractMessage(html, 'You have already responded to this action sheet.'),
          color: '#1976d2',
        })
      } else if (html.includes('Response Updated') || html.includes('recorded successfully')) {
        const responseMatch = html.match(/"([^"]*)" has been recorded/)
                           || html.match(/&quot;([^&]*)&quot; has been recorded/)
        const recordedResponse = responseMatch?.[1] || response
        setResult({
          status: 'success',
          title: '✅ Response Recorded',
          message: `Your response "${recordedResponse}" has been recorded successfully for Action Sheet ${sheet}.`,
          color: '#16a34a',
        })
      } else if (html.includes('Information Only') || html.includes('information only')) {
        setResult({
          status: 'info',
          title: 'ℹ️ Information Only',
          message: 'This action sheet was sent to you for information only. No response is required.',
          color: '#1976d2',
        })
      } else if (html.includes('Invalid') || html.includes('expired')) {
        setResult({
          status: 'invalid',
          title: '⚠️ Invalid Link',
          message: 'This response link has expired or is invalid.',
          color: '#e65100',
        })
      } else if (html.includes('Not Found')) {
        setResult({
          status: 'error',
          title: '⚠️ Sheet Not Found',
          message: `Action Sheet ${sheet} does not exist.`,
          color: '#e65100',
        })
      } else if (html.includes('Error') || !res.ok) {
        setResult({
          status: 'error',
          title: '❌ Error',
          message: 'An error occurred while processing your response. Please try again later.',
          color: '#dc2626',
        })
      } else {
        setResult({
          status: 'success',
          title: '✅ Response Recorded',
          message: `Your response "${response}" has been recorded successfully.`,
          color: '#16a34a',
        })
      }
    } catch (err: any) {
      console.error('Failed to process email response:', err)
      setResult({
        status: 'error',
        title: '❌ Connection Error',
        message: 'Could not reach the server. Please check your connection and try again.',
        color: '#dc2626',
      })
    }
  }

  function extractMessage(html: string, fallback: string): string {
    const match = html.match(/<p>(.*?)<\/p>/s)
    if (match) {
      return match[1].replace(/<[^>]+>/g, '').trim() || fallback
    }
    return fallback
  }

  // Determine button color and emoji for the response type
  function getResponseStyle(resp: string) {
    const upper = (resp || '').toUpperCase()
    if (upper.includes('ACTION TAKEN') || upper.includes('COMPLETED')) return { color: '#16a34a', emoji: '✅' }
    if (upper.includes('PROGRESS')) return { color: '#2563eb', emoji: '🔄' }
    if (upper.includes('NOTED') || upper.includes('ACKNOWLEDGED')) return { color: '#6b7280', emoji: '📋' }
    if (upper.includes('REVIEW')) return { color: '#d97706', emoji: '🔍' }
    if (upper.includes('REJECT')) return { color: '#dc2626', emoji: '❌' }
    if (upper.includes('APPROVED')) return { color: '#16a34a', emoji: '✅' }
    return { color: '#800000', emoji: '📋' }
  }

  const isLoading = result.status === 'loading'
  const isConfirm = result.status === 'confirm'
  const style = getResponseStyle(response || '')

  return (
    <div style={{
      margin: 0,
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f0ea 0%, #e8e0d4 100%)',
      fontFamily: "'Segoe UI', -apple-system, Arial, sans-serif",
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        maxWidth: 480,
        width: '100%',
        overflow: 'hidden',
        animation: 'fadeIn 0.5s ease-out',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #800000, #5c0000)',
          padding: '24px',
          textAlign: 'center',
        }}>
          <h1 style={{ color: 'white', fontSize: 16, fontWeight: 600, margin: 0 }}>
            AL-AHLIA CONTRACTING GROUP
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, margin: 0 }}>
            Action Sheet System
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          {isLoading ? (
            <>
              <div style={{
                width: 48,
                height: 48,
                border: '4px solid #f0ebe5',
                borderTopColor: '#800000',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px',
              }} />
              <h2 style={{ color: '#800000', fontSize: 20, marginBottom: 8 }}>
                {result.title}
              </h2>
              <p style={{ color: '#666', fontSize: 14, margin: 0 }}>{result.message}</p>
            </>
          ) : isConfirm ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {style.emoji}
              </div>
              <h2 style={{ color: '#333', fontSize: 20, marginBottom: 8 }}>
                Confirm Your Response
              </h2>
              <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                You are about to respond to this action sheet with:
              </p>
              <div style={{
                display: 'inline-block',
                background: style.color,
                color: 'white',
                padding: '8px 20px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 16,
                marginBottom: 16,
              }}>
                {response}
              </div>
              <p style={{ color: '#999', fontSize: 12, marginBottom: 24 }}>
                Sheet: {sheet}
              </p>
              <button
                onClick={submitResponse}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '16px',
                  background: style.color,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {style.emoji} Click to Confirm Response
              </button>
            </>
          ) : (
            <>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: `${result.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 36,
              }}>
                {result.status === 'success' ? '✅' :
                 result.status === 'already' ? 'ℹ️' :
                 result.status === 'info' ? '📋' :
                 result.status === 'invalid' ? '⚠️' : '❌'}
              </div>
              <h2 style={{ color: result.color, fontSize: 22, marginBottom: 12 }}>
                {result.title}
              </h2>
              <p style={{
                color: '#555',
                fontSize: 14,
                lineHeight: 1.6,
                margin: 0,
              }}>
                {result.message}
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          background: '#faf8f5',
          padding: 16,
          textAlign: 'center',
          borderTop: '1px solid #e5e0d8',
        }}>
          <p style={{ color: '#999', fontSize: 11, margin: 0 }}>
            {isConfirm ? 'If you did not request this, you can safely close this page.' : 'You may close this window.'}
          </p>
        </div>
      </div>

      {/* Inline keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
