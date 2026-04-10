import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { sheetsApi } from '../api/client'
import { ActionSheet } from '../store'
import dayjs from 'dayjs'

export default function PrintView() {
  const [sheets, setSheets] = useState<ActionSheet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Read ?ids=1,2,3 from URL
    const params = new URLSearchParams(window.location.search)
    const idsString = params.get('ids')
    
    if (!idsString) {
      setLoading(false)
      return
    }

    const ids = idsString.split(',').map(id => id.trim())
    
    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          ids.map(id => sheetsApi.getById(id).then(res => res.data))
        )
        setSheets(results.filter(Boolean))
      } catch (err) {
        console.error('Failed to fetch some sheets for printing', err)
      } finally {
        setLoading(false)
        // Auto-print after a small delay to ensure images/styles loaded
        setTimeout(() => window.print(), 500)
      }
    }

    fetchAll()
  }, [])

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" tip="Preparing documents for printing..." />
    </div>
  }

  if (sheets.length === 0) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>No sheets selected or found for printing.</div>
  }

  return (
    <div style={{ background: 'white' }}>
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-after: always; margin-bottom: 2cm; }
          .page-break:last-child { page-break-after: auto; margin-bottom: 0; }
        }
        .print-container { max-width: 800px; margin: 0 auto; font-family: Inter, sans-serif; color: black; }
        .print-header { display: flex; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 20px; margin-bottom: 20px; }
        .print-logo { font-weight: 800; font-size: 24px; letter-spacing: -0.5px; }
        .print-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .print-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; font-size: 13px; }
        .print-meta-item { border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .print-meta-label { font-weight: 600; color: #555; display: inline-block; width: 100px; }
        
        .print-section { margin-bottom: 30px; }
        .print-section h3 { background: #f0f0f0; padding: 6px 12px; font-size: 14px; margin-bottom: 10px; }
        
        .print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .print-table th, .print-table td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
        .print-table th { background: #fafafa; font-weight: 600; }
      `}</style>
      
      <div className="print-container">
        {sheets.map((sheet, idx) => {
          const formData = sheet.formData || {}
          return (
            <div key={sheet.id} className="page-break" style={{ padding: '40px 20px' }}>
              <div className="print-header">
                <div>
                  <div className="print-logo">Al-Ahlia Contracting Group</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Action Sheet Report</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{formData.refNo || sheet.id}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>Printed: {dayjs().format('DD/MM/YYYY')}</div>
                </div>
              </div>

              <div className="print-title">{sheet.title}</div>
              
              <div className="print-meta">
                <div className="print-meta-item"><span className="print-meta-label">Status:</span> <b>{sheet.status}</b></div>
                <div className="print-meta-item"><span className="print-meta-label">Date Created:</span> {dayjs(sheet.createdDate).format('DD MMM YYYY')}</div>
                <div className="print-meta-item"><span className="print-meta-label">Project:</span> {sheet.projectId || 'General'}</div>
                <div className="print-meta-item"><span className="print-meta-label">From:</span> {formData.from || '—'}</div>
              </div>

              <div className="print-section">
                <h3>Document Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px', fontSize: 13 }}>
                  <b>Date Received:</b> <span>{formData.dateReceived || '—'}</span>
                  <b>Doc Date:</b> <span>{formData.documentDate || '—'}</span>
                  <b>Original To:</b> <span>{formData.originalTo || '—'}</span>
                  <b>Method:</b> <span>
                    {[
                      formData.isLetter && 'Letter',
                      formData.isFax && 'Fax',
                      formData.isCopy && 'Copy',
                      formData.isEmail && 'Email'
                    ].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
              </div>

              <div className="print-section">
                <h3>Recipients & Responses</h3>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Type</th>
                      <th>Status/Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sheet.assignedTo || {}).length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>No recipients assigned.</td></tr>
                    ) : (
                      Object.entries(sheet.assignedTo || {}).map(([email, name]) => (
                        <tr key={email}>
                          <td>{name}</td>
                          <td style={{ fontFamily: 'monospace' }}>{email}</td>
                          <td>{sheet.recipientTypes?.[email] || 'ACTION'}</td>
                          <td>
                            <b style={{ color: sheet.responses?.[email] ? '#10b981' : '#f59e0b' }}>
                              {sheet.responses?.[email] || 'Awaiting response'}
                            </b>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
