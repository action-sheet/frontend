import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Table, Tag, message, Modal, Input, Form, Empty } from 'antd'
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, ProjectOutlined,
  FileTextOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import { projectsApi, sheetsApi } from '../api/client'
import dayjs from 'dayjs'

interface Project { id: string; name: string; path?: string; color?: string }
interface Sheet { id: string; title: string; status: string; workflowState: string; createdDate: string }

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [sheetsLoading, setSheetsLoading] = useState(false)
  const [addModal, setAddModal] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try { const res = await projectsApi.getAll(); setProjects(res.data || []) }
    catch { message.error('Failed to load projects') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleSelectProject = async (p: Project) => {
    setSelectedProject(p)
    setSheetsLoading(true)
    try {
      const res = await sheetsApi.getAll()
      // Normalize to lowercase alpha-only for fuzzy matching
      const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const projNorm = normalize(p.name)
      const filtered = (res.data || []).filter((s: any) => {
        // 1. Exact projectId match
        if (s.projectId === p.id) return true
        // 2. Sheet ID starts with normalized project name (e.g. MERCEDESSHUWAIKH-... → mercedesshuwaikh)
        const idNorm = normalize(s.id)
        if (projNorm.length >= 3 && idNorm.startsWith(projNorm)) return true
        // 3. originalTo field contains the project name
        const origNorm = normalize(s.formData?.originalTo)
        if (projNorm.length >= 3 && origNorm.includes(projNorm)) return true
        return false
      })
      setSheets(filtered)
    } catch { message.error('Failed to load sheets') }
    finally { setSheetsLoading(false) }
  }

  const handleAdd = async () => {
    try {
      const v = await form.validateFields()
      await projectsApi.create({ name: v.name.trim() })
      message.success(`Project "${v.name}" created`)
      setAddModal(false); form.resetFields(); fetchProjects()
    } catch { message.error('Failed to create project') }
  }

  const handleDelete = (p: Project) => {
    Modal.confirm({
      title: 'Delete Project', icon: <ExclamationCircleOutlined />,
      content: `Delete "${p.name}"? Action sheets will remain but lose their project link.`,
      okText: 'Delete', okType: 'danger',
      onOk: async () => {
        await projectsApi.delete(p.id)
        message.success('Project deleted')
        if (selectedProject?.id === p.id) { setSelectedProject(null); setSheets([]) }
        fetchProjects()
      },
    })
  }

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: 'orange', PENDING: 'blue', 'IN PROGRESS': 'processing',
      'ACTION TAKEN': 'green', COMPLETED: 'green', REJECTED: 'red',
      'INFORMATIONAL ONLY': 'default', APPROVED: 'green', NOTED: 'cyan',
    }
    return map[s?.toUpperCase()] || 'default'
  }

  // Helper: Check if all recipients are info-only
  const isInformationalOnly = (sheet: Sheet) => {
    // Note: Projects page might not have recipientTypes, so we'll need to check if available
    const recipientTypes = (sheet as any).recipientTypes || {}
    const typeValues = Object.values(recipientTypes)
    return typeValues.length > 0 && typeValues.every(t => t === 'INFO')
  }

  // Helper: Get display status
  const getDisplayStatus = (sheet: Sheet) => {
    if (isInformationalOnly(sheet) && sheet.status !== 'DRAFT') {
      return 'INFORMATIONAL ONLY'
    }
    return sheet.status
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>Dashboard</Button>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
            <ProjectOutlined style={{ color: '#2563eb', marginRight: 8 }} />Projects
          </h2>
          <Tag>{projects.length} projects</Tag>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModal(true)}>New Project</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, minHeight: 400 }}>
        {/* Left — Project list */}
        <div style={{ background: '#faf8f5', border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto', maxHeight: 600 }}>
          {projects.map(p => (
            <div key={p.id} onClick={() => handleSelectProject(p)}
              style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background: selectedProject?.id === p.id ? '#eef2ff' : 'transparent',
                borderLeft: selectedProject?.id === p.id ? '3px solid #2563eb' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{p.id}</div>
            </div>
          ))}
          {projects.length === 0 && !loading && (
            <div style={{ padding: 24, textAlign: 'center', color: '#ccc' }}>No projects</div>
          )}
        </div>

        {/* Right — Action sheets for selected project */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
          {selectedProject ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontWeight: 600 }}>
                  <FileTextOutlined style={{ marginRight: 8 }} />{selectedProject.name}
                </h3>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(selectedProject)}>Delete Project</Button>
              </div>
              <Table
                dataSource={sheets}
                loading={sheetsLoading}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
                onRow={r => ({ onClick: () => navigate(`/sheet/${r.id}`), style: { cursor: 'pointer' } })}
                locale={{ emptyText: 'No action sheets assigned to this project.' }}
                columns={[
                  { title: 'ID', dataIndex: 'id', key: 'id', width: 200,
                    render: (id: string) => <code style={{ fontSize: 11, color: '#7c3aed' }}>{id}</code> },
                  { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true,
                    render: (t: string) => <strong>{t}</strong> },
                  { title: 'Status', dataIndex: 'status', key: 'status', width: 120,
                    render: (s: string, sheet: Sheet) => {
                      const displayStatus = getDisplayStatus(sheet)
                      return <Tag color={statusColor(displayStatus)}>{displayStatus}</Tag>
                    } },
                  { title: 'Created', dataIndex: 'createdDate', key: 'date', width: 140,
                    render: (d: string) => d ? dayjs(d).format('DD MMM YYYY') : '—' },
                ]}
              />
            </>
          ) : (
            <Empty description="Select a project to view its action sheets" style={{ marginTop: 80 }} />
          )}
        </div>
      </div>

      <Modal title="New Project" open={addModal} onOk={handleAdd} onCancel={() => setAddModal(false)} okText="Create">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Project Name" rules={[{ required: true }]}><Input placeholder="e.g. Mercedes Shuwaikh" /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
