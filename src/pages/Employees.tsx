import { useEffect, useState, useCallback } from 'react'
import { Table, Input, Button, Modal, Form, message, Tag } from 'antd'
import { SearchOutlined, PlusOutlined, DeleteOutlined, SyncOutlined, ReloadOutlined } from '@ant-design/icons'
import { employeesApi } from '../api/client'

const { Search } = Input

interface Employee {
  email: string
  name: string
  department: string
  role: string
  position?: string
  activeDirectory?: string
  active: boolean
  hierarchyLevel?: number
  bossEmail?: string
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [form] = Form.useForm()

  const fetchEmployees = useCallback(async (search?: string) => {
    setLoading(true)
    try {
      const res = search
        ? await employeesApi.search(search)
        : await employeesApi.getAll()
      setEmployees(res.data)
    } catch {
      message.error('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const handleSearch = (v: string) => {
    setSearchTerm(v)
    fetchEmployees(v || undefined)
  }

  const handleAdd = async () => {
    try {
      const values = await form.validateFields()
      await employeesApi.create(values)
      message.success('Employee added')
      setAddModal(false)
      form.resetFields()
      fetchEmployees()
    } catch {
      message.error('Failed to add employee')
    }
  }

  const handleDelete = (email: string, name: string) => {
    Modal.confirm({
      title: 'Delete Employee',
      content: `Remove "${name}" (${email})?`,
      okText: 'Delete', okType: 'danger',
      onOk: async () => {
        await employeesApi.delete(email)
        message.success('Employee removed')
        fetchEmployees(searchTerm || undefined)
      },
    })
  }

  const roleColor = (role: string) => {
    const map: Record<string, string> = {
      'GM': 'red', 'EX.MS': 'orange', 'Admin': 'blue',
      'Project Manager': 'green', 'O.M': 'purple',
    }
    return map[role] || 'default'
  }

  const columns = [
    {
      title: 'Name', dataIndex: 'name', key: 'name',
      sorter: (a: Employee, b: Employee) => a.name.localeCompare(b.name),
      render: (name: string, r: Employee) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {r.activeDirectory && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              AD: {r.activeDirectory}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Email', dataIndex: 'email', key: 'email',
      render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{v}</span>,
    },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    {
      title: 'Role', dataIndex: 'role', key: 'role', width: 140,
      filters: [
        { text: 'GM', value: 'GM' },
        { text: 'EX.MS', value: 'EX.MS' },
        { text: 'Project Manager', value: 'Project Manager' },
        { text: 'Department User', value: 'Department User' },
      ],
      onFilter: (v: any, r: Employee) => r.role === v,
      render: (role: string) => <Tag color={roleColor(role)}>{role}</Tag>,
    },
    {
      title: 'Status', key: 'status', width: 80,
      render: (_: any, r: Employee) => (
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: r.active ? 'var(--success)' : '#ccc',
        }} />
      ),
    },
    {
      title: '', key: 'actions', width: 60,
      render: (_: any, r: Employee) => (
        <Button type="text" size="small" danger icon={<DeleteOutlined />}
          onClick={() => handleDelete(r.email, r.name)} />
      ),
    },
  ]

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{employees.length} employees</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<SyncOutlined />} onClick={() => fetchEmployees()}>AD Sync</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModal(true)}>
            Add Employee
          </Button>
        </div>
      </div>

      <div className="action-bar">
        <Search placeholder="Search employees..." allowClear enterButton={<SearchOutlined />}
          size="large" style={{ maxWidth: 380 }} onSearch={handleSearch}
          onChange={e => !e.target.value && handleSearch('')} />
        <Button icon={<ReloadOutlined />} size="large" onClick={() => fetchEmployees()} loading={loading}>
          Refresh
        </Button>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <Table columns={columns} dataSource={employees} rowKey="email" loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => <span style={{ color: 'var(--text-muted)' }}>{t} employees</span> }}
          size="middle" />
      </div>

      {/* Add Employee Modal */}
      <Modal title="Add Employee" open={addModal} onOk={handleAdd}
        onCancel={() => { setAddModal(false); form.resetFields() }} okText="Add">
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="John Doe" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="john@acg.com.kw" />
          </Form.Item>
          <Form.Item name="department" label="Department">
            <Input placeholder="Engineering" />
          </Form.Item>
          <Form.Item name="role" label="Role" initialValue="Department User">
            <Input placeholder="Department User" />
          </Form.Item>
          <Form.Item name="activeDirectory" label="Active Directory">
            <Input placeholder="AD username" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
