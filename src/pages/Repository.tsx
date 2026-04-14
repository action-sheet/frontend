import { useEffect, useState, useCallback, useRef } from 'react'
import { Calendar, Button, Upload, Tooltip, message, Modal } from 'antd'
import {
  UploadOutlined, DeleteOutlined, EyeOutlined, FileOutlined,
  FilePdfOutlined, FileImageOutlined, FileWordOutlined, FileExcelOutlined,
  FileZipOutlined, InboxOutlined, UndoOutlined,
  FolderOpenOutlined, PlusOutlined, CloseOutlined,
} from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { repositoryApi } from '../api/client'

interface RepoDocument {
  id: string
  fileName: string
  originalName: string
  uploaderName: string
  uploadTimestamp: number
  fileSize: number
  deleted: boolean
  deletedBy?: string
  deletedTimestamp?: number
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['pdf'].includes(ext)) return <FilePdfOutlined style={{ color: '#e53e3e', fontSize: 22 }} />
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) return <FileImageOutlined style={{ color: '#805ad5', fontSize: 22 }} />
  if (['doc', 'docx'].includes(ext)) return <FileWordOutlined style={{ color: '#2b6cb0', fontSize: 22 }} />
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileExcelOutlined style={{ color: '#38a169', fontSize: 22 }} />
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileZipOutlined style={{ color: '#d69e2e', fontSize: 22 }} />
  return <FileOutlined style={{ color: '#718096', fontSize: 22 }} />
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function Repository() {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [docs, setDocs] = useState<RepoDocument[]>([])
  const [deletedDocs, setDeletedDocs] = useState<RepoDocument[]>([])
  const [docDates, setDocDates] = useState<Set<number>>(new Set())
  const [showDeleted, setShowDeleted] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fileList, setFileList] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const dateKey = selectedDate.format('YYYY-MM-DD')

  const fetchDocs = useCallback(async () => {
    try {
      const res = await repositoryApi.getDocuments(dateKey, showDeleted)
      const allDocs: RepoDocument[] = res.data || []
      setDocs(allDocs.filter(d => !d.deleted))
      setDeletedDocs(allDocs.filter(d => d.deleted))
    } catch {
      setDocs([])
      setDeletedDocs([])
    }
  }, [dateKey, showDeleted])

  const fetchDocDates = useCallback(async () => {
    try {
      const year = selectedDate.year()
      const month = selectedDate.month() + 1
      const res = await repositoryApi.getDatesWithDocs(year, month)
      setDocDates(new Set(res.data || []))
    } catch {
      setDocDates(new Set())
    }
  }, [selectedDate])

  useEffect(() => { fetchDocs() }, [fetchDocs])
  useEffect(() => { fetchDocDates() }, [fetchDocDates])

  const handleFileUpload = useCallback(async () => {
    if (fileList.length === 0) return
    setUploading(true)
    try {
      await repositoryApi.upload(dateKey, fileList)
      message.success(`${fileList.length} file(s) uploaded to ${selectedDate.format('DD MMM YYYY')}`)
      setFileList([])
      fetchDocs()
      fetchDocDates()
    } catch {
      message.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [fileList, dateKey, selectedDate, fetchDocs, fetchDocDates])

  const handleFileSelect = useCallback((files: File[]) => {
    setFileList(prev => [...prev, ...files])
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setFileList(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Native drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFileSelect(files)
  }, [handleFileSelect])

  const handleDelete = (doc: RepoDocument) => {
    Modal.confirm({
      title: 'Delete Document',
      content: `Hide "${doc.originalName}" from the repository? The file can be restored later.`,
      okText: 'Delete', okType: 'danger',
      onOk: async () => {
        await repositoryApi.deleteDocument(dateKey, doc.id)
        fetchDocs()
        fetchDocDates()
        message.success('Document hidden')
      },
    })
  }

  const handleRestore = async (doc: RepoDocument) => {
    await repositoryApi.restoreDocument(dateKey, doc.id)
    fetchDocs()
    fetchDocDates()
    message.success(`${doc.originalName} restored`)
  }

  const handleOpen = (doc: RepoDocument) => {
    const url = repositoryApi.downloadUrl(dateKey, doc.fileName)
    window.open(url, '_blank')
  }

  // Calendar cell renderer — show red dots on dates with documents
  const dateCellRender = (value: Dayjs) => {
    const day = value.date()
    const sameMonth = value.month() === selectedDate.month() && value.year() === selectedDate.year()
    const hasDocs = sameMonth && docDates.has(day)
    return (
      <div style={{ position: 'relative' }}>
        {hasDocs && (
          <div style={{
            position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
            width: 6, height: 6, borderRadius: '50%', background: '#e53e3e',
          }} />
        )}
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><FolderOpenOutlined style={{ marginRight: 8 }} />Document Repository</h1>
          <p className="page-subtitle">📅 Calendar-based document manager — drag & drop files</p>
        </div>
      </div>

      <div className="responsive-layout-sidebar" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, minHeight: 'calc(100vh - 220px)' }}>
        {/* LEFT: Calendar */}
        <div style={{
          background: 'white', border: '1px solid var(--border)', borderRadius: 10,
          padding: 12, overflow: 'hidden',
        }}>
          <Calendar
            fullscreen={false}
            value={selectedDate}
            onSelect={(date) => setSelectedDate(date)}
            onPanelChange={(date) => { setSelectedDate(date); }}
            cellRender={(current, info) => {
              if (info.type === 'date') return dateCellRender(current as Dayjs)
              return info.originNode
            }}
          />
          <div style={{ padding: '8px 4px', borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <Button type="link" size="small" onClick={() => setSelectedDate(dayjs())}
              style={{ padding: 0, fontSize: '0.8rem' }}>
              📌 Go to Today
            </Button>
          </div>
        </div>

        {/* RIGHT: Documents panel */}
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            background: dragOver ? 'rgba(37, 99, 235, 0.06)' : 'white',
            border: dragOver ? '2px dashed #2563eb' : '1px solid var(--border)',
            borderRadius: 10, display: 'flex', flexDirection: 'column',
            transition: 'all 0.2s ease', position: 'relative',
          }}
        >
          {/* Document header */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                {selectedDate.format('dddd, DD MMMM YYYY')}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {docs.length} document{docs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {fileList.length > 0 && (
                <>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 4 }}>
                    {fileList.length} file{fileList.length !== 1 ? 's' : ''} ready
                  </span>
                  <Button 
                    icon={<UploadOutlined />} 
                    type="primary" 
                    size="small"
                    loading={uploading}
                    onClick={handleFileUpload}
                  >
                    Upload Now
                  </Button>
                  <Button 
                    size="small"
                    onClick={() => setFileList([])}
                    disabled={uploading}
                  >
                    Clear
                  </Button>
                </>
              )}
              <Upload
                multiple 
                showUploadList={false}
                beforeUpload={(_file, fileList) => {
                  handleFileSelect(fileList as unknown as File[])
                  return false
                }}
              >
                <Button icon={<PlusOutlined />} size="small" disabled={uploading}>
                  {fileList.length > 0 ? 'Add More' : 'Select Files'}
                </Button>
              </Upload>
              <Button size="small"
                onClick={() => setShowDeleted(!showDeleted)}
                type={showDeleted ? 'primary' : 'default'}
                danger={showDeleted}
              >
                {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
              </Button>
            </div>
          </div>

          {/* Drag-drop overlay */}
          {dragOver && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(37, 99, 235, 0.08)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ textAlign: 'center', color: '#2563eb' }}>
                <InboxOutlined style={{ fontSize: 48, marginBottom: 8 }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Drop files here</div>
                <div style={{ fontSize: '0.8rem' }}>Upload to {selectedDate.format('DD MMM YYYY')}</div>
              </div>
            </div>
          )}

          {/* Document list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
            {/* Queued files for upload */}
            {fileList.length > 0 && (
              <div style={{ marginBottom: 12, padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#1e40af' }}>
                  📤 Ready to Upload ({fileList.length})
                </div>
                {fileList.map((file, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                    background: 'white', borderRadius: 6, marginBottom: 4,
                  }}>
                    {getFileIcon(file.name)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {formatSize(file.size)}
                      </div>
                    </div>
                    <Button 
                      type="text" 
                      size="small" 
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleRemoveFile(idx)}
                      disabled={uploading}
                    />
                  </div>
                ))}
              </div>
            )}

            {docs.length === 0 && !showDeleted ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <InboxOutlined style={{ fontSize: 48, marginBottom: 12, display: 'block', color: '#ccc' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: 4 }}>No documents</div>
                <div style={{ fontSize: '0.8rem' }}>
                  Drag & drop files here or click Upload to add documents for this date
                </div>
              </div>
            ) : (
              <>
                {docs.map(doc => (
                  <div key={doc.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    borderRadius: 8, marginBottom: 4, background: '#fafaf8',
                    border: '1px solid #f0ebe4', transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f0ea')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fafaf8')}
                    onDoubleClick={() => handleOpen(doc)}
                  >
                    {getFileIcon(doc.fileName)}
                    <div style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}>
                      <Tooltip title={doc.originalName}>
                        <div style={{ fontWeight: 500, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.originalName}
                        </div>
                      </Tooltip>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                        <span>{formatSize(doc.fileSize)}</span>
                        <span>{doc.uploaderName}</span>
                        <span>{dayjs(doc.uploadTimestamp).format('HH:mm')}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <Tooltip title="Open"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleOpen(doc)} /></Tooltip>
                      <Tooltip title="Delete">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />}
                          onClick={(e) => { e.stopPropagation(); handleDelete(doc) }} />
                      </Tooltip>
                    </div>
                  </div>
                ))}

                {/* Deleted documents section */}
                {showDeleted && deletedDocs.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', padding: '4px 8px', marginBottom: 4 }}>
                      🗑️ Deleted ({deletedDocs.length})
                    </div>
                    {deletedDocs.map(doc => (
                      <div key={doc.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                        borderRadius: 8, marginBottom: 4, background: '#fff5f5',
                        border: '1px solid #fed7d7', opacity: 0.7,
                      }}>
                        {getFileIcon(doc.fileName)}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '0.85rem', textDecoration: 'line-through', color: '#888' }}>
                            {doc.originalName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
                            Deleted by {doc.deletedBy} • {doc.deletedTimestamp ? dayjs(doc.deletedTimestamp).format('HH:mm') : ''}
                          </div>
                        </div>
                        <Tooltip title="Restore">
                          <Button type="text" size="small" icon={<UndoOutlined style={{ color: '#38a169' }} />}
                            onClick={() => handleRestore(doc)} />
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
