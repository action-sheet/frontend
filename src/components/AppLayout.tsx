import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Button, Dropdown, Modal, Input, message } from 'antd'
import {
  PlusOutlined,
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined,
  TeamOutlined,
  ProjectOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FolderOpenOutlined,
  AppstoreOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store'
import { projectsApi } from '../api/client'

const { Sider, Content, Header } = Layout

interface Project {
  id: string
  name: string
  path?: string
  color?: string
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  // Projects state
  const [projects, setProjects] = useState<Project[]>([])

  const [newProjectModal, setNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  // Project selection dialog (for New Sheet)
  const [projectSelectModal, setProjectSelectModal] = useState(false)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectsApi.getAll()
      setProjects(res.data || [])
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

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


  const isAdmin = user?.role?.toLowerCase() === 'admin'

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    {
      key: 'new-sheet-trigger',
      icon: <PlusOutlined />,
      label: 'New Sheet',
    },
    { key: '/repository', icon: <FolderOpenOutlined />, label: 'Repository' },
    { type: 'divider' as const },
    { key: '/employees', icon: <TeamOutlined />, label: 'Manage Users' },
    { key: '/projects', icon: <ProjectOutlined />, label: `Projects (${projects.length})` },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
    ...(isAdmin ? [
      { type: 'divider' as const },
      { key: '/admin/draft-recovery', icon: <FileTextOutlined />, label: 'Draft Recovery' },
    ] : []),
  ]

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `${user?.name || 'User'} (${user?.role || ''})`,
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      danger: true,
      onClick: () => { logout(); navigate('/login') },
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'new-sheet-trigger') {
      handleNewSheetClick()
      return
    }
    if (key === 'projects-trigger') {
      return // handled by dropdown
    }
    navigate(key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        collapsedWidth={64}
        trigger={null}
        style={{
          background: '#ffffff',
          borderRight: '1px solid var(--border)',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        {/* Logo Area */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 16px',
            borderBottom: '1px solid var(--border)',
            gap: 10,
          }}
        >
          <img
            src="/acg_logo.jpg"
            alt="ACG"
            style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4 }}
          />
          {!collapsed && (
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#800000',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              Action Sheets
            </span>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ background: 'transparent', border: 'none', marginTop: 4 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 64 : 220, transition: 'margin-left 0.2s' }}>
        {/* Beige Gradient Header — matches legacy */}
        <Header
          style={{
            background: 'linear-gradient(135deg, #d2bea0, #b9a587)',
            borderBottom: '1px solid #a89878',
            padding: '0 24px',
            height: 54,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 9,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ color: '#503820', fontSize: 16 }}
            />
            <Button
              type={location.pathname === '/' ? 'primary' : 'text'}
              icon={<DashboardOutlined />}
              onClick={() => navigate('/')}
              style={{
                fontWeight: 600,
                fontSize: '0.82rem',
                color: location.pathname === '/' ? 'white' : '#503820',
                background: location.pathname === '/' ? '#800000' : 'transparent',
                borderColor: location.pathname === '/' ? '#800000' : 'transparent',
                borderRadius: 6,
                height: 34,
              }}
            >
              Dashboard
            </Button>
            <div id="navbar-actions" style={{ marginLeft: 4 }}></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="live-dot" />
            <span style={{ fontSize: '0.78rem', color: '#5a4030', marginRight: 12 }}>
              Connected
            </span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <Button
                type="text"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  height: 38, padding: '4px 12px', borderRadius: 8,
                  color: '#3a2a18',
                }}
              >
                <Avatar
                  size={26}
                  style={{ background: '#800000', fontSize: 11, fontWeight: 600 }}
                >
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  {user?.name || 'User'}
                </span>
              </Button>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ background: 'var(--bg-primary)' }}>
          {children}
        </Content>
      </Layout>

      {/* Project Selection Modal — shown when clicking "New Sheet" */}
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
    </Layout>
  )
}
