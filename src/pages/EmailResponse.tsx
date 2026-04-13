import { useEffect, useState } from 'react'

/**
 * EmailResponse — Standalone page that processes email response clicks.
 *
 * WHY THIS EXISTS:
 * Email buttons previously linked directly to the ngrok backend URL,
 * which showed ngrok's browser warning interstitial page.
 *
 * This page is served by Vercel (no ngrok) and uses fetch() with the
 * 'ngrok-skip-browser-warning' header to call the backend API silently,
 * completely bypassing the ngrok warning on all devices and browsers.
 *
 * URL format: /respond?sheet=XX&email=XX&response=XX&token=XX
 */

const API_BASE = import.meta.env.VITE_API_URL || ''

type Status = 'loading' | 'success' | 'already' | 'info' | 'error' | 'invalid'

interface ResponseResult {
  status: Status
  title: string
  message: string
  color: string
}

export default function EmailResponse() {
  const [result, setResult] = useState<ResponseResult>({
    status: 'loading',
    title: 'Processing Your Response',
    message: 'Please wait...',
    color: '#800000',
  })

  useEffect(() => {
    processResponse()
  }, [])

  async function processResponse() {
    const params = new URLSearchParams(window.location.search)
    const sheet = params.get('sheet')
    const email = params.get('email')
    const response = params.get('response')
    const token = params.get('token')

    // Validate required params
    if (!sheet || !email || !response || !token) {
      setResult({
        status: 'invalid',
        title: '⚠️ Invalid Link',
        message: 'This response link is missing required parameters.',
        color: '#e65100',
      })
      return
    }

    try {
      // Call the backend API with ngrok-skip header to bypass interstitial
      const apiUrl = `${API_BASE}/api/respond?` + new URLSearchParams({
        sheet,
        email,
        response,
        token,
      }).toString()

      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Accept': 'text/html,application/json',
        },
      })

      // The backend returns HTML, but we need to parse the result
      // from the response status and body to show our own UI
      const html = await res.text()

      // Parse the response from the backend HTML
      if (html.includes('Already Responded') || html.includes('already responded')) {
        setResult({
          status: 'already',
          title: 'ℹ️ Already Responded',
          message: extractMessage(html, 'You have already responded to this action sheet.'),
          color: '#1976d2',
        })
      } else if (html.includes('Response Updated') || html.includes('recorded successfully')) {
        // Extract the response value from the HTML
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
        // Default success (the backend responded OK but format unknown)
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

  // Extract a readable message from the backend HTML
  function extractMessage(html: string, fallback: string): string {
    const match = html.match(/<p>(.*?)<\/p>/s)
    if (match) {
      // Strip HTML tags from the extracted message
      return match[1].replace(/<[^>]+>/g, '').trim() || fallback
    }
    return fallback
  }

  const isLoading = result.status === 'loading'

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
            You may close this window.
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
