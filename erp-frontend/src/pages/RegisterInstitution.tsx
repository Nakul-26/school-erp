import './RegisterInstitution.css';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const INSTITUTION_TYPES: { value: string; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'college', label: 'College (General)' },
  { value: 'pu_college', label: 'PU College' },
  { value: 'degree_college', label: 'Degree College' },
  { value: 'engineering_college', label: 'Engineering College' },
  { value: 'university', label: 'University' },
  { value: 'coaching', label: 'Coaching Institute' },
];

export default function RegisterInstitution() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [institutionType, setInstitutionType] = useState('college');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (adminPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (adminPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/auth/register-institution', {
        name,
        institution_type: institutionType,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_phone: adminPhone || undefined,
        admin_password: adminPassword,
        invite_code: inviteCode || undefined,
      });
      login(data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-institution-card">
        <h2>Register Your Institution</h2>
        <p className="register-institution-subtitle">
          Set up a new institution workspace and its first administrator account.
        </p>

        <form onSubmit={handleSubmit}>
          <fieldset className="register-institution-fieldset">
            <legend>Institution Details</legend>

            <div className="input-group">
              <label>Institution Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Greenwood International College"
              />
            </div>

            <div className="input-group">
              <label>Institution Type *</label>
              <select value={institutionType} onChange={(e) => setInstitutionType(e.target.value)} required>
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="register-institution-row">
              <div className="input-group">
                <label>Institution Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="office@institution.edu"
                />
              </div>
              <div className="input-group">
                <label>Institution Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, State"
              />
            </div>
          </fieldset>

          <fieldset className="register-institution-fieldset">
            <legend>Administrator Account</legend>

            <div className="input-group">
              <label>Your Full Name *</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                minLength={2}
                placeholder="Jane Doe"
              />
            </div>

            <div className="register-institution-row">
              <div className="input-group">
                <label>Your Email *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="you@institution.edu"
                />
              </div>
              <div className="input-group">
                <label>Your Phone</label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="register-institution-row">
              <div className="input-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="input-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="If your provider requires one"
              />
              <p className="register-institution-hint">
                Leave blank unless you were given an invite code by the platform operator.
              </p>
            </div>
          </fieldset>

          {error && <p className="register-institution-error">{error}</p>}

          <button type="submit" className="btn btn-primary register-institution-btn" disabled={loading}>
            {loading ? 'Creating institution...' : 'Create Institution & Sign In'}
          </button>
        </form>

        <div className="register-institution-footer">
          Already have an institution? <Link to="/login">Sign in instead</Link>
        </div>
      </div>
    </div>
  );
}
