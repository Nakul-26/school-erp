import './ForgotPassword.css';
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      const data = await api.post('/auth/forgot-password', { email })
      setMessage(data.message)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>
        <p className="forgot-password-text-1">Enter your email and we'll send you a reset link.</p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="you@college.edu"
            />
          </div>
          {error && <p className="forgot-password-text-2">{error}</p>}
          {message && <p className="forgot-password-text-3">{message}</p>}
          <button type="submit" className="btn btn-primary forgot-password-btn" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <div className="forgot-password-div-5">
          <Link to="/login" className="forgot-password-Link-6">Back to Login</Link>
        </div>
      </div>
    </div>
  )
}
