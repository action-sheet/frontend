import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import { MailOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const onFinish = async (values: { email: string }) => {
    setLoading(true)
    try {
      const success = await login(values.email)
      if (success) {
        message.success('Welcome back!')
        navigate('/')
      } else {
        message.error('User not found or inactive')
      }
    } catch {
      message.error('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #faf8f5 0%, #f0ebe4 50%, #e8e0d4 100%)',
      }}
    >
      <div
        className="fade-in"
        style={{
          width: 400,
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '44px 36px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        }}
      >
        {/* Logo + Branding */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src="/acg_logo.jpg"
            alt="ACG Logo"
            style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 16 }}
          />
          <h1 style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#800000',
            marginBottom: 4,
          }}>
            AL-AHLIA CONTRACTING GROUP
          </h1>
          <p style={{ color: '#800000', fontSize: '0.85rem', fontWeight: 600 }}>
            المجموعة الاهلية للمقاولات
          </p>
          <p style={{ color: '#888', fontSize: '0.78rem', marginTop: 8 }}>
            Action Sheet System v3.0
          </p>
        </div>

        <Form name="login" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#aaa' }} />}
              placeholder="Enter your email address"
              style={{
                height: 48,
                fontSize: '0.95rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              icon={<ArrowRightOutlined />}
              style={{
                height: 48,
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: 8,
                background: '#800000',
                borderColor: '#800000',
              }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{
          textAlign: 'center', marginTop: 28, paddingTop: 16,
          borderTop: '1px solid var(--border)',
          color: '#bbb', fontSize: '0.72rem',
        }}>
          v3.0 · Modern Web Edition
        </div>
      </div>
    </div>
  )
}
