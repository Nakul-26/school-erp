import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Percent, 
  Award, 
  Save, 
  Database, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Camera,
  Sliders
} from 'lucide-react';

type SettingsTab = 'general' | 'rules' | 'backup';


export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [academicYears, setAcademicYears] = useState<any[]>([]);

  // Settings form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState('');
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState('');
  const [attendanceThreshold, setAttendanceThreshold] = useState('75');
  const [passingMarks, setPassingMarks] = useState('40');

  // Rule settings states
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [gradingSystem, setGradingSystem] = useState<string>('Percentage');
  const [gracePeriod, setGracePeriod] = useState<string>('15');
  const [lockAfterHours, setLockAfterHours] = useState<string>('24');


  // Backup state
  const [backupFile, setBackupFile] = useState<File | null>(null);

  // Loading / Banner states
  const [loading, setLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettingsAndYears();
  }, []);

  const fetchSettingsAndYears = async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsData, yearsData, platformSettings] = await Promise.all([
        api.get('/system/settings'),
        api.get('/academic-years').catch(() => []),
        api.get('/system-settings').catch(() => [])
      ]);

      setName(settingsData.name || '');
      setEmail(settingsData.email || '');
      setPhone(settingsData.phone || '');
      setAddress(settingsData.address || '');
      setLogo(settingsData.logo || '');
      setCurrentAcademicYearId(settingsData.current_academic_year_id || '');
      setPassingMarks(String(settingsData.passing_marks ?? '40'));

      const safeParse = (val: string, fallback: any) => {
        if (!val) return fallback;
        try { return JSON.parse(val); } catch { return val; }
      };

      const thresholdVal = platformSettings.find((s: any) => s.setting_key === 'attendance_threshold')?.setting_value;
      const daysVal = platformSettings.find((s: any) => s.setting_key === 'working_days')?.setting_value;
      const gradingVal = platformSettings.find((s: any) => s.setting_key === 'grading_system')?.setting_value;
      const graceVal = platformSettings.find((s: any) => s.setting_key === 'grace_period_minutes')?.setting_value;
      const lockVal = platformSettings.find((s: any) => s.setting_key === 'lock_after_hours')?.setting_value;

      if (thresholdVal) setAttendanceThreshold(String(safeParse(thresholdVal, '75')));
      if (daysVal) setWorkingDays(safeParse(daysVal, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']));
      if (gradingVal) setGradingSystem(safeParse(gradingVal, 'Percentage'));
      if (graceVal) setGracePeriod(String(safeParse(graceVal, '15')));
      if (lockVal) setLockAfterHours(String(safeParse(lockVal, '24')));

      setAcademicYears(yearsData);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load settings. Make sure you have correct admin permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.post('/system/settings', {
        name,
        email,
        phone,
        address,
        logo,
        current_academic_year_id: currentAcademicYearId || null,
        attendance_threshold: parseFloat(attendanceThreshold) || 75.0,
        passing_marks: parseFloat(passingMarks) || 40.0
      });
      setSuccess('Institution configurations saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update system settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleRulesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.post('/system-settings', {
        settings: [
          { category: 'attendance', setting_key: 'attendance_threshold', setting_value: JSON.stringify(Number(attendanceThreshold)) },
          { category: 'academic', setting_key: 'working_days', setting_value: JSON.stringify(workingDays) },
          { category: 'academic', setting_key: 'grading_system', setting_value: JSON.stringify(gradingSystem) },
          { category: 'attendance', setting_key: 'grace_period_minutes', setting_value: JSON.stringify(Number(gracePeriod)) },
          { category: 'attendance', setting_key: 'lock_after_hours', setting_value: JSON.stringify(Number(lockAfterHours)) }
        ]
      });
      setSuccess('Academic rules and system preferences saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update system rules.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setSuccess(null);
    setLogoLoading(true);

    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      setLogoLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.upload('/system/settings/logo', formData);
      setLogo(response.url);
      setSuccess('Institution logo uploaded successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to upload institution logo.');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleExportBackup = async () => {
    setError(null);
    setSuccess(null);
    setBackupLoading(true);

    try {
      const token = localStorage.getItem('erp_token');
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
      
      const res = await fetch(`${baseUrl}/system/backup/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Export failed. Check permissions.');
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `erp_backup_${Date.now()}.sql`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess('Database backup file (.sql) downloaded successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to download database backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFile) return;

    setError(null);
    setSuccess(null);
    setBackupLoading(true);

    const formData = new FormData();
    formData.append('file', backupFile);

    try {
      await api.upload('/system/backup/restore', formData);
      setSuccess('Database restored successfully from backup script.');
      setBackupFile(null);
      
      // Reload settings to match restored state
      fetchSettingsAndYears();
    } catch (err: any) {
      setError(err.message || 'Database restoration failed. Verify backup file corresponds to this tenant.');
    } finally {
      setBackupLoading(false);
    }
  };

  const getLogoUrl = (logoPath?: string) => {
    if (!logoPath) return '';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    const path = logoPath.startsWith('/') ? logoPath : `/${logoPath}`;
    return `${baseUrl}${path}`;
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2>Institution Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage configurations, default thresholds, current academic terms, and execute database tasks.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button 
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
          disabled={loading || backupLoading}
        >
          <Building2 size={18} />
          Institution Settings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
          disabled={loading || backupLoading}
        >
          <Sliders size={18} />
          Academic Rules & Preferences
        </button>
        <button 
          className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
          disabled={loading || backupLoading}
        >
          <Database size={18} />
          Backup & Disaster Recovery
        </button>
      </div>

      <div className="settings-container">
        {error && (
          <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {activeTab === 'general' && (
          <form onSubmit={handleSettingsSubmit} className="settings-form">
            <div className="settings-split">
              {/* Left Side: General Profile / Logo */}
              <div className="card settings-left-card">
                <h3>Institution Logo</h3>
                
                <div className="logo-upload-wrapper">
                  {logo ? (
                    <img 
                      src={getLogoUrl(logo)} 
                      alt="Logo" 
                      className="institution-logo-preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/120?text=ERP+Logo';
                      }}
                    />
                  ) : (
                    <div className="logo-placeholder">
                      <Building2 size={48} />
                    </div>
                  )}

                  <label className="logo-upload-btn">
                    <Camera size={16} />
                    {logoLoading ? 'Uploading...' : 'Upload Logo'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      disabled={logoLoading}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>

              {/* Right Side: Inputs */}
              <div className="card settings-right-card">
                <h3>Institution Configurations</h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Institution Name</label>
                    <div className="input-with-icon">
                      <Building2 size={18} className="input-icon" />
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        required 
                        placeholder="e.g. Greenwood Academy"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Contact Email</label>
                    <div className="input-with-icon">
                      <Mail size={18} className="input-icon" />
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        placeholder="info@school.edu"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Contact Phone</label>
                    <div className="input-with-icon">
                      <Phone size={18} className="input-icon" />
                      <input 
                        type="text" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="Phone number"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Address</label>
                    <div className="input-with-icon">
                      <MapPin size={18} className="input-icon" />
                      <input 
                        type="text" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        placeholder="Street address, city"
                      />
                    </div>
                  </div>
                </div>

                <h3 style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>Academic Defaults</h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Current Academic Term / Year</label>
                    <div className="input-with-icon">
                      <Calendar size={18} className="input-icon" />
                      <select 
                        value={currentAcademicYearId} 
                        onChange={(e) => setCurrentAcademicYearId(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                      >
                        <option value="">-- No Active Year Select --</option>
                        {academicYears.map(year => (
                          <option key={year.id} value={year.id}>{year.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Attendance Threshold (%)</label>
                    <div className="input-with-icon">
                      <Percent size={18} className="input-icon" />
                      <input 
                        type="number" 
                        value={attendanceThreshold} 
                        onChange={(e) => setAttendanceThreshold(e.target.value)} 
                        min="0" 
                        max="100" 
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Exam Passing Mark (%)</label>
                    <div className="input-with-icon">
                      <Award size={18} className="input-icon" />
                      <input 
                        type="number" 
                        value={passingMarks} 
                        onChange={(e) => setPassingMarks(e.target.value)} 
                        min="0" 
                        max="100" 
                        required
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2rem', width: 'fit-content' }}
                >
                  <Save size={18} />
                  {loading ? 'Saving Configurations...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'backup' && (
          <div className="backup-section">
            <div className="settings-split">
              {/* Left Side: Export info */}
              <div className="card settings-left-card">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
                  <Database size={48} style={{ color: 'var(--primary)' }} />
                  <h3>Create Database Dump</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Export a copy of your school’s academic data. This will output a SQL file containing definitions and inserts.
                  </p>
                  <button 
                    className="btn btn-outline" 
                    onClick={handleExportBackup}
                    disabled={backupLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}
                  >
                    {backupLoading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    Export SQL Backup
                  </button>
                </div>
              </div>

              {/* Right Side: Restore form */}
              <div className="card settings-right-card">
                <h3>Restore System Data</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Warning: Uploading a database restore backup will overwrite current configurations, timetable, student rosters, exam marks, and ledgers.
                </p>

                <form onSubmit={handleRestoreBackup} className="restore-form">
                  <div className="restore-dropzone" style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fafafa' }}>
                    <Upload size={32} style={{ color: 'var(--secondary)', opacity: 0.5, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {backupFile ? `Selected Backup: ${backupFile.name}` : 'Drop SQL backup file here or select file to restore'}
                    </p>
                    <label className="btn btn-outline" style={{ marginTop: '0.75rem' }}>
                      Choose Backup File
                      <input 
                        type="file" 
                        accept=".sql" 
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) setBackupFile(files[0] || null);
                        }} 
                        disabled={backupLoading}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-danger" 
                    disabled={backupLoading || !backupFile}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', width: 'fit-content' }}
                  >
                    {backupLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Executing restore scripts...
                      </>
                    ) : (
                      <>
                        <Database size={18} />
                        Restore SQL Script
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <form onSubmit={handleRulesSubmit} className="settings-form">
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={20} className="text-primary" /> Academic Rules & Preferences
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label>Attendance Threshold (%)</label>
                    <input 
                      type="number" 
                      value={attendanceThreshold} 
                      onChange={e => setAttendanceThreshold(e.target.value)} 
                      min={0} 
                      max={100} 
                      required 
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Students with attendance below this will trigger warnings.</p>
                  </div>

                  <div className="form-group">
                    <label>Grading System</label>
                    <select 
                      value={gradingSystem} 
                      onChange={e => setGradingSystem(e.target.value)}
                    >
                      <option value="Percentage">Percentage (%)</option>
                      <option value="GPA">GPA Scale (10.0)</option>
                      <option value="Letter">Letter Grades (A-F)</option>
                    </select>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Default grading schema for report card builders.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label>Attendance Late Grace Period (Minutes)</label>
                    <input 
                      type="number" 
                      value={gracePeriod} 
                      onChange={e => setGracePeriod(e.target.value)} 
                      min={0} 
                      required 
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Minutes a student can be late before being marked as late/absent.</p>
                  </div>

                  <div className="form-group">
                    <label>Attendance Lock Duration (Hours)</label>
                    <input 
                      type="number" 
                      value={lockAfterHours} 
                      onChange={e => setLockAfterHours(e.target.value)} 
                      min={0} 
                      required 
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hours after class slot during which teachers can submit or edit attendance.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Working Days</label>
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                      const checked = workingDays.includes(day);
                      return (
                        <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            style={{ width: 'auto', cursor: 'pointer' }}
                            onChange={e => {
                              if (e.target.checked) {
                                setWorkingDays([...workingDays, day]);
                              } else {
                                setWorkingDays(workingDays.filter(d => d !== day));
                              }
                            }}
                          />
                          {day}
                        </label>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Operational days in the academic calendar.</p>
                </div>

              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Save size={16} /> Save Academic Rules
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .settings-tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.75rem;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: white;
          cursor: pointer;
          font-weight: 600;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .tab-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .settings-split {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .settings-split {
            grid-template-columns: 1fr;
          }
        }
        .settings-left-card {
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .settings-left-card h3 {
          margin-top: 0;
          font-size: 1rem;
          margin-bottom: 1.5rem;
        }
        .logo-upload-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .institution-logo-preview {
          width: 120px;
          height: 120px;
          border-radius: var(--radius-md);
          object-fit: contain;
          border: 1px solid var(--border);
          padding: 0.5rem;
        }
        .logo-placeholder {
          width: 120px;
          height: 120px;
          border-radius: var(--radius-md);
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8c8c8c;
          border: 1px solid var(--border);
        }
        .logo-upload-btn {
          margin-top: 1rem;
          background: var(--primary);
          color: white;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: background 0.2s;
        }
        .logo-upload-btn:hover {
          background: #0f1c3f;
        }
        .settings-right-card {
          padding: 2rem;
        }
        .settings-right-card h3 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #434343;
        }
        .input-with-icon {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #8c8c8c;
          pointer-events: none;
        }
        .input-with-icon input, .input-with-icon select {
          width: 100%;
          padding: 0.6rem 0.6rem 0.6rem 2.5rem;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
          background: white;
        }
        .input-with-icon input:focus, .input-with-icon select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
