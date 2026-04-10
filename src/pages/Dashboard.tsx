import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Input, Modal, message, Tooltip, Dropdown } from 'antd'
import {
  PlusOutlined, SearchOutlined, ReloadOutlined, DeleteOutlined,
  EyeOutlined, ExclamationCircleOutlined, ThunderboltOutlined,
  ClockCircleOutlined, CheckCircleOutlined, WarningOutlined,
  FileTextOutlined, EditOutlined, TeamOutlined, ProjectOutlined,
  SettingOutlined, DownloadOutlined, PrinterOutlined, MailOutlined,
  MoreOutlined, FilePdfOutlined, PaperClipOutlined, AppstoreOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useSheetsStore, useAuthStore, type ActionSheet } from '../store'
import { projectsApi } from '../api/client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Search } = Input

interface Project {
  id: string
  name: string
  path?: string
  color?: string
}

/* ── Status Pill ── */
function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    'ACTION TAKEN': 'success', 'APPROVED': 'success', 'NOTED': 'info', 'COMPLETED': 'success',
    'PENDING': 'warning', 'DRAFT': 'draft-pulse', 'IN PROGRESS': 'accent',
    'REJECTED / RETURNED': 'danger', 'REVIEW REQUESTED': 'warning', 'INFORMATIONAL ONLY': 'muted',
  }
  return <span className={`status-pill status-pill--${map[status] || 'muted'}`}>{status || 'UNKNOWN'}</span>
}

/* ── Progress Ring ── */
function ProgressRing({ responded, total, size = 30 }: { responded: number; total: number; size?: number }) {
  const pct = total > 0 ? responded / total : 0
  const r = (size - 4) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const color = pct === 1 ? 'var(--success)' : pct > 0 ? 'var(--accent)' : '#ddd'
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eee" strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s var(--ease)' }} />
      </svg>
      <span className="progress-ring-text">{responded}</span>
    </div>
  )
}

/* ── Skeleton ── */
function DashboardSkeleton() {
  return (
    <div className="page-container fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:24 }}>
        <div><div className="skeleton" style={{ width:200, height:24 }} /><div className="skeleton skeleton-text w-short" style={{ marginTop:8 }} /></div>
        <div className="skeleton" style={{ width:140, height:40, borderRadius:6 }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        {[1,2,3,4,5].map(i => <div key={i} className="skeleton skeleton-card" />)}
      </div>
      {[1,2,3,4,5].map(i => <div key={i} className="skeleton skeleton-row" />)}
    </div>
  )
}

/* ── MAIN DASHBOARD ── */
export default function Dashboard() {
  const { sheets, isLoading, fetchSheets, deleteSheet } = useSheetsStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [, setSearchTerm] = useState('')
  const [initialLoad, setInitialLoad] = useState(true)

  // Projects state for "New Sheet" project selection
  const [projects, setProjects] = useState<Project[]>([])
  const [projectSelectModal, setProjectSelectModal] = useState(false)
  const [newProjectModal, setNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectsApi.getAll()
      setProjects(res.data || [])
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => {
    fetchSheets().finally(() => setInitialLoad(false))
    fetchProjects()
    const iv = setInterval(() => fetchSheets(), 30000)
    return () => clearInterval(iv)
  }, [fetchSheets, fetchProjects])

  const handleSearch = useCallback((v: string) => {
    setSearchTerm(v); fetchSheets(v || undefined)
  }, [fetchSheets])

  const handleDelete = (id: string, title: string) => {
    Modal.confirm({
      title: 'Delete Action Sheet',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${title}"?`,
      okText: 'Delete', okType: 'danger',
      onOk: async () => { await deleteSheet(id, user?.email || 'unknown'); message.success('Sheet deleted') },
    })
  }

  // New Action Sheet — show project selection dialog
  const handleNewSheetClick = () => {
    if (projects.length > 0) {
      setProjectSelectModal(true)
    } else {
      navigate('/sheet/new')
    }
  }

  const handleProjectSelected = (projectId: string) => {
    setProjectSelectModal(false)
    navigate(`/sheet/new?project=${encodeURIComponent(projectId)}`)
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) { message.warning('Enter a project name'); return }
    try {
      await projectsApi.create({ name: newProjectName.trim() })
      message.success(`Project "${newProjectName}" created`)
      setNewProjectName('')
      setNewProjectModal(false)
      fetchProjects()
    } catch {
      message.error('Failed to create project')
    }
  }

  const stats = useMemo(() => ({
    total: sheets.length,
    drafts: sheets.filter(s => s.workflowState === 'DRAFT').length,
    inProgress: sheets.filter(s => ['IN_PROGRESS','PENDING_REVIEW'].includes(s.workflowState)).length,
    completed: sheets.filter(s => s.workflowState === 'COMPLETED').length,
    conflicts: sheets.filter(s => s.hasConflict).length,
  }), [sheets])

  /* Sort: DRAFT sheets first, then newest (most recent) on top */
  const sortedSheets = useMemo(() => {
    return [...sheets].sort((a, b) => {
      const aDraft = a.workflowState === 'DRAFT' || a.status === 'DRAFT'
      const bDraft = b.workflowState === 'DRAFT' || b.status === 'DRAFT'
      if (aDraft && !bDraft) return -1
      if (!aDraft && bDraft) return 1
      // Within same group: newest first (by createdDate desc)
      const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0
      const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0
      return dateB - dateA
    })
  }, [sheets])

  const columns: ColumnsType<ActionSheet> = [
    {
      title: 'Sheet', key: 'sheet',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 1 }}>{r.title || r.id}</div>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--text-muted)' }}>{r.id}</span>
        </div>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 160,
      filters: [
        { text:'Draft', value:'DRAFT' }, { text:'Pending', value:'PENDING' },
        { text:'Action Taken', value:'ACTION TAKEN' }, { text:'Approved', value:'APPROVED' },
      ],
      onFilter: (v, r) => r.status === v,
      render: (status: string, r) => (
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <StatusPill status={status} />
          {r.overriddenBy && <Tooltip title={`Locked by GM: ${r.overriddenBy}`}><span style={{cursor:'help'}}>🔒</span></Tooltip>}
        </div>
      ),
    },
    {
      title: 'Ref. No', key: 'refNo', width: 140,
      render: (_, r) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.formData?.refNo || '—'}</span>,
    },
    {
      title: 'Responses', key: 'responses', width: 90, align: 'center' as const,
      render: (_, r) => {
        const total = r.recipientCount ?? Object.keys(r.assignedTo || {}).length
        const responded = r.responseCount ?? Object.keys(r.responses || {}).length
        return (
          <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
            <ProgressRing responded={responded} total={total} />
            <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>/{total}</span>
          </div>
        )
      },
    },
    {
      title: 'Date Created', dataIndex: 'createdDate', key: 'createdDate', width: 130,
      sorter: (a, b) => dayjs(a.createdDate).unix() - dayjs(b.createdDate).unix(),
      render: (date: string) => {
        const d = dayjs(date)
        return (
          <Tooltip title={d.format('ddd, DD MMM YYYY HH:mm')}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {date ? d.format('DD MMM YYYY') : '—'}
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: '', key: 'actions', width: 200,
      render: (_, r) => {
        const isDraft = r.workflowState === 'DRAFT' || r.status === 'DRAFT'
        return (
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            {isDraft ? (
              <Button size="small" icon={<EditOutlined />}
                style={{ background: '#fee2e2', borderColor: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: '0.75rem' }}
                onClick={(e) => { e.stopPropagation(); navigate(`/sheet/${r.id}/edit`) }}>
                Edit Draft
              </Button>
            ) : (
              <Button size="small" icon={<FilePdfOutlined />}
                style={{ background: '#2563eb', borderColor: '#2563eb', color: 'white', fontWeight: 600, fontSize: '0.75rem' }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (r.pdfPath) {
                    const url = projectsApi.serveFileUrl(r.pdfPath)
                    window.open(url, '_blank')
                  } else {
                    navigate(`/sheet/${r.id}`)
                  }
                }}>
                View PDF
              </Button>
            )}
            {/* File/Attachments preview button */}
            {r.pdfPath && (
              <Tooltip title="View attached file">
                <Button size="small" icon={<PaperClipOutlined />}
                  style={{ fontWeight: 600, fontSize: '0.75rem' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    const url = projectsApi.serveFileUrl(r.pdfPath!)
                    window.open(url, '_blank')
                  }}
                />
              </Tooltip>
            )}
            <Dropdown menu={{ items: [
              { key:'view', icon:<EyeOutlined />, label:'View Details', onClick:() => navigate(`/sheet/${r.id}`) },
              { key:'edit', icon:<EditOutlined />, label:'Edit', onClick:() => navigate(`/sheet/${r.id}/edit`) },
              ...(r.pdfPath ? [{ key:'pdf', icon:<FilePdfOutlined />, label:'Open PDF', onClick:() => window.open(projectsApi.serveFileUrl(r.pdfPath!), '_blank') }] : []),
              { type:'divider' as const },
              { key:'delete', icon:<DeleteOutlined />, label:'Delete', danger:true, onClick:() => handleDelete(r.id, r.title) },
            ]}} trigger={['click']}>
              <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} />
            </Dropdown>
          </div>
        )
      },
    },
  ]

  if (initialLoad && isLoading) return <DashboardSkeleton />

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Action Sheets</h1>
          <p className="page-subtitle">
            {stats.total} total · {stats.inProgress} active
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large"
          onClick={handleNewSheetClick}
          style={{ height: 40, paddingInline: 20, fontWeight: 600 }}>
          New Action Sheet
        </Button>
      </div>

      {/* ── Admin Panel & Stats (Visible to Admin Only) ── */}
      {user?.role === 'admin' && (
        <>
          <div className="admin-panel">
            <div className="admin-panel-title">⚙ Administration</div>
            <div className="admin-btn-group">
              <Button icon={<TeamOutlined />} onClick={() => navigate('/employees')}>Manage Users & Employees</Button>
              <Button icon={<ProjectOutlined />} onClick={() => navigate('/projects')}>Manage Projects</Button>
              <Button icon={<MailOutlined />} onClick={() => message.info('Email Config coming soon...')}>Email Config</Button>
              <Button icon={<SettingOutlined />} onClick={() => message.info('AD Settings coming soon...')}>AD Settings</Button>
              <Button icon={<ExclamationCircleOutlined />} onClick={() => message.info('Notifications coming soon...')}>Notifications</Button>
              <Button icon={<DownloadOutlined />} onClick={() => message.info('Backup Data coming soon...')}>Backup Data</Button>
              <Button icon={<PrinterOutlined />} onClick={() => message.info('Print functionality coming soon...')}>Print</Button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
            {[
              { label:'Total', value:stats.total, icon:<FileTextOutlined />, color:'var(--accent)' },
              { label:'Drafts', value:stats.drafts, icon:<EditOutlined />, color:'var(--warning)' },
              { label:'Active', value:stats.inProgress, icon:<ClockCircleOutlined />, color:'var(--info)' },
              { label:'Completed', value:stats.completed, icon:<CheckCircleOutlined />, color:'var(--success)' },
              { label:'Conflicts', value:stats.conflicts, icon:<ThunderboltOutlined />, color:'var(--danger)' },
            ].map(s => (
              <div className="stat-card fade-in-up" key={s.label}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                  <div style={{ width:32, height:32, borderRadius:6, display:'flex',
                    alignItems:'center', justifyContent:'center', fontSize:14, color:s.color,
                    background: s.color === 'var(--accent)' ? 'var(--accent-muted)' :
                      s.color === 'var(--warning)' ? 'var(--warning-muted)' :
                      s.color === 'var(--info)' ? 'var(--info-muted)' :
                      s.color === 'var(--success)' ? 'var(--success-muted)' : 'var(--danger-muted)' }}>
                    {s.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Search Bar */}
      <div className="action-bar">
        <Search placeholder="Search sheets..." allowClear enterButton={<SearchOutlined />}
          size="large" style={{ maxWidth:380 }} onSearch={handleSearch}
          onChange={e => !e.target.value && handleSearch('')} />
        <Button icon={<ReloadOutlined />} size="large" onClick={() => fetchSheets()} loading={isLoading}>Refresh</Button>
      </div>

      {/* Table */}
      <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
        {sheets.length === 0 && !isLoading ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No action sheets yet</div>
            <div className="empty-state-desc">Create your first action sheet to start tracking tasks and collecting responses.</div>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleNewSheetClick} style={{ height:38, paddingInline:20 }}>
              Create Action Sheet
            </Button>
          </div>
        ) : (
          <Table columns={columns} dataSource={sortedSheets} rowKey="id" loading={isLoading}
            pagination={{ pageSize:20, showSizeChanger:true, showTotal: t => <span style={{color:'var(--text-muted)'}}>{t} sheets</span> }}
            size="middle"
            onRow={r => ({
              onClick: () => navigate(`/sheet/${r.id}`),
              onDoubleClick: (e) => {
                e.preventDefault()
                const isDraft = r.workflowState === 'DRAFT' || r.status === 'DRAFT'
                if (isDraft) {
                  navigate(`/sheet/${r.id}/edit`)
                } else if (r.pdfPath) {
                  // Open PDF in new tab
                  window.open(projectsApi.serveFileUrl(r.pdfPath), '_blank')
                } else {
                  navigate(`/sheet/${r.id}`)
                }
              },
              style: { cursor: 'pointer' },
            })} />
        )}
      </div>

      {/* ═══ Project Selection Modal ═══ */}
      <Modal
        title={<><AppstoreOutlined /> Select Project</>}
        open={projectSelectModal}
        onCancel={() => setProjectSelectModal(false)}
        footer={[
          <Button key="none" onClick={() => { setProjectSelectModal(false); navigate('/sheet/new') }}>
            No Project (General)
          </Button>,
          <Button key="cancel" onClick={() => setProjectSelectModal(false)}>
            Cancel
          </Button>,
        ]}
        width={500}
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.85rem' }}>
          Assign this Action Sheet to a project. Select a project below or proceed without one.
        </p>
        <div style={{ maxHeight: 350, overflow: 'auto' }}>
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => handleProjectSelected(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 8, marginBottom: 6,
                border: '1px solid var(--border)', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f0ea'; e.currentTarget.style.borderColor = '#2563eb' }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: p.color || 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 14,
              }}>
                {p.name[0]?.toUpperCase() || 'P'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {p.id}
                </div>
              </div>
              <ProjectOutlined style={{ color: '#888', fontSize: 16 }} />
            </div>
          ))}
          {projects.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              No projects created yet. Create one below or proceed without.
            </div>
          )}
        </div>
        <Button
          type="dashed" block style={{ marginTop: 12 }}
          icon={<PlusOutlined />}
          onClick={() => { setProjectSelectModal(false); setNewProjectModal(true) }}
        >
          Create New Project
        </Button>
      </Modal>

      {/* Create Project Modal */}
      <Modal
        title="Create New Project"
        open={newProjectModal}
        onOk={handleCreateProject}
        onCancel={() => { setNewProjectModal(false); setNewProjectName('') }}
        okText="Create"
      >
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600 }}>
            Project Name
          </label>
          <Input
            size="large"
            placeholder="e.g. Mercedes Workshop, KDC Tower..."
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onPressEnter={handleCreateProject}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  )
}
