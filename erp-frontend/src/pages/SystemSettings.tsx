import './SystemSettings.css';
import './GradeSettings.css';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
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
  Sliders,
  RefreshCw
} from 'lucide-react';

type SettingsTab = 'general' | 'rules' | 'grades' | 'backup';

interface GradeScale {
  id?: string;
  grade: string;
  min_percent: number;
  max_percent: number;
  grade_point: number;
  remarks: string;
  is_passing: number;
  sort_order: number;
}

export default function SystemSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'general';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const toast = useToast();

  // Grade Scales state
  const [scales, setScales] = useState<GradeScale[]>([]);
  const [scalesLoading, setScalesLoading] = useState(false);
  const [scalesSaving, setScalesSaving] = useState(false);

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
    fetchScales();
  }, []);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fetchScales = async () => {
    try {
      setScalesLoading(true);
      const data = await api.get('/grades/scales');
      setScales(data || []);
    } catch (err) {
      console.error('Error fetching grade scales:', err);
    } finally {
      setScalesLoading(false);
    }
  };

  const handleLoadDefaultScales = async () => {
    if (!confirm('Are you sure you want to load default grading scales? This will overwrite your current configuration.')) {
      return;
    }
    try {
      setScalesSaving(true);
      await api.post('/grades/scales/seed', {});
      toast.success('Default grading scales loaded successfully!');
      fetchScales();
    } catch (err: any) {
      toast.error('Error loading default grade scales');
    } finally {
      setScalesSaving(false);
    }
  };

  const handleSaveScales = async () => {
    try {
      setScalesSaving(true);
      const payload = scales.map((s, idx) => ({
        grade: s.grade,
        min_percent: s.min_percent,
        max_percent: s.max_percent,
        grade_point: s.grade_point,
        remarks: s.remarks,
        is_passing: s.is_passing,
        sort_order: s.sort_order || (idx + 1)
      }));
      await api.put('/grades/scales', { scales: payload });
      toast.success('Grading scales updated successfully!');
      fetchScales();
    } catch (err: any) {
      toast.error(err.message || 'Error saving grading scales');
    } finally {
      setScalesSaving(false);
    }
  };

  const handleGradeRowChange = (index: number, field: keyof GradeScale, value: any) => {
    setScales(prev => prev.map((s, i) => {
      if (i === index) {
        return {
          ...s,
          [field]: field === 'grade' || field === 'remarks' ? value : Number(value)
        };
      }
      return s;
    }));
  };

  const handleAddGradeRow = () => {
    setScales(prev => [
      ...prev,
      {
        grade: '',
        min_percent: 0,
        max_percent: 100,
        grade_point: 0,
        remarks: '',
        is_passing: 1,
        sort_order: prev.length + 1
      }
    ]);
  };

  const handleRemoveGradeRow = (index: number) => {
    setScales(prev => prev.filter((_, i) => i !== index));
  };

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
      <PageGuidance
        title="System Settings"
        description="Use this page to enable or disable features, manage security settings, and configure defaults."
        steps={["Toggle optional modules (like leaves, payroll, or admissions).","Set rules for default passwords and session times.","Manage global settings for your school portal."]}
      />
      <div className="page-header">
        <div>
          <h2>Institution Settings</h2>
          <p className="system-settings-text-1">
            Manage configurations, default thresholds, current academic terms, and execute database tasks.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button 
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => handleTabChange('general')}
          disabled={loading || backupLoading}
        >
          <Building2 size={18} />
          Institution Settings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => handleTabChange('rules')}
          disabled={loading || backupLoading}
        >
          <Sliders size={18} />
          Academic Rules & Preferences
        </button>
        <button 
          className={`tab-btn ${activeTab === 'grades' ? 'active' : ''}`}
          onClick={() => handleTabChange('grades')}
          disabled={loading || backupLoading}
        >
          <Award size={18} />
          Grade Settings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => handleTabChange('backup')}
          disabled={loading || backupLoading}
        >
          <Database size={18} />
          Backup & Disaster Recovery
        </button>
      </div>

      <div className="settings-container">
        {error && (
          <div className="alert alert-danger system-settings-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success system-settings-alert">
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
                    <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={logoLoading} className="system-settings-input-4"  />
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

                  <div className="form-group system-settings-form-group">
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

                <h3 className="system-settings-title-6">Academic Defaults</h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Current Academic Term / Year</label>
                    <div className="input-with-icon">
                      <Calendar size={18} className="input-icon" />
                      <select value={currentAcademicYearId} onChange={(e) => setCurrentAcademicYearId(e.target.value)} className="system-settings-select-7">
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

                <button type="submit" className="btn btn-primary system-settings-btn" disabled={loading}>
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
                <div className="system-settings-col-9">
                  <Database size={48} className="system-settings-Database-10"  />
                  <h3>Create Database Dump</h3>
                  <p className="system-settings-text-11">
                    Export a copy of your school’s academic data. This will output a SQL file containing definitions and inserts.
                  </p>
                  <button className="btn btn-outline system-settings-btn" onClick={handleExportBackup} disabled={backupLoading}>
                    {backupLoading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    Export SQL Backup
                  </button>
                </div>
              </div>

              {/* Right Side: Restore form */}
              <div className="card settings-right-card">
                <h3>Restore System Data</h3>
                <p className="system-settings-text-13">
                  Warning: Uploading a database restore backup will overwrite current configurations, timetable, student rosters, exam marks, and ledgers.
                </p>

                <form onSubmit={handleRestoreBackup} className="restore-form">
                  <div className="restore-dropzone system-settings-restore-dropzone">
                    <Upload size={32} className="system-settings-Upload-15"  />
                    <p className="system-settings-text-16">
                      {backupFile ? `Selected Backup: ${backupFile.name}` : 'Drop SQL backup file here or select file to restore'}
                    </p>
                    <label className="btn btn-outline system-settings-btn">
                      Choose Backup File
                      <input type="file" accept=".sql" onChange={(e) => { const files = e.target.files; if (files && files.length> 0) setBackupFile(files[0] || null); }} disabled={backupLoading} className="system-settings-input-18"  />
                    </label>
                  </div>

                  <button type="submit" className="btn btn-primary btn-danger system-settings-btn" disabled={backupLoading || !backupFile}>
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
            <div className="card system-settings-card">
              <h3 className="system-settings-row-21">
                <Sliders size={20} className="text-primary" /> Academic Rules & Preferences
              </h3>

              <div className="system-settings-col-22">
                
                <div className="system-settings-grid-23">
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
                    <p className="system-settings-text-24">Students with attendance below this will trigger warnings.</p>
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
                    <p className="system-settings-text-25">Default grading schema for report card builders.</p>
                  </div>
                </div>

                <div className="system-settings-grid-26">
                  <div className="form-group">
                    <label>Attendance Late Grace Period (Minutes)</label>
                    <input 
                      type="number" 
                      value={gracePeriod} 
                      onChange={e => setGracePeriod(e.target.value)} 
                      min={0} 
                      required 
                    />
                    <p className="system-settings-text-27">Minutes a student can be late before being marked as late/absent.</p>
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
                    <p className="system-settings-text-28">Hours after class slot during which teachers can submit or edit attendance.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Working Days</label>
                  <div className="system-settings-row-29">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                      const checked = workingDays.includes(day);
                      return (
                        <label key={day} className="system-settings-row-30">
                          <input type="checkbox" checked={checked} className="system-settings-input-31" onChange={e => { if (e.target.checked) { setWorkingDays([...workingDays, day]); } else { setWorkingDays(workingDays.filter(d => d !== day)); } }} />
                          {day}
                        </label>
                      );
                    })}
                  </div>
                  <p className="system-settings-text-32">Operational days in the academic calendar.</p>
                </div>

              </div>

              <div className="modal-actions system-settings-modal-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Save size={16} /> Save Academic Rules
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'grades' && (
          <div className="card grade-settings-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>Grade Scale Configuration</h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                  Configure default marks-to-grade scaling ranges used across exams and report card generation.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-outline" onClick={handleLoadDefaultScales} disabled={scalesLoading || scalesSaving}>
                  <RefreshCw size={16} /> Load Default Scale
                </button>
                <button className="btn btn-primary" onClick={handleSaveScales} disabled={scalesLoading || scalesSaving || scales.length === 0}>
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>

            {scalesLoading ? <p>Loading grade scale configuration...</p> : (
              <div>
                <table className="table grade-settings-table">
                  <thead>
                    <tr>
                      <th>Grade</th>
                      <th>Min %</th>
                      <th>Max %</th>
                      <th>Grade Point (GPA)</th>
                      <th>Remarks / Description</th>
                      <th>Status</th>
                      <th>Sort Order</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scales.map((s, idx) => (
                      <tr key={idx}>
                        <td>
                          <input type="text" value={s.grade} onChange={(e) => handleGradeRowChange(idx, 'grade', e.target.value)} placeholder="e.g. A+" className="grade-settings-input-7" />
                        </td>
                        <td>
                          <input type="number" value={s.min_percent} onChange={(e) => handleGradeRowChange(idx, 'min_percent', e.target.value)} className="grade-settings-input-8" />
                        </td>
                        <td>
                          <input type="number" value={s.max_percent} onChange={(e) => handleGradeRowChange(idx, 'max_percent', e.target.value)} className="grade-settings-input-9" />
                        </td>
                        <td>
                          <input type="number" step="0.1" value={s.grade_point} onChange={(e) => handleGradeRowChange(idx, 'grade_point', e.target.value)} className="grade-settings-input-10" />
                        </td>
                        <td>
                          <input type="text" value={s.remarks || ''} onChange={(e) => handleGradeRowChange(idx, 'remarks', e.target.value)} placeholder="e.g. Outstanding" className="grade-settings-input-11" />
                        </td>
                        <td>
                          <select value={s.is_passing} onChange={(e) => handleGradeRowChange(idx, 'is_passing', e.target.value)} className="grade-settings-select-12">
                            <option value={1}>Pass</option>
                            <option value={0}>Fail</option>
                          </select>
                        </td>
                        <td>
                          <input type="number" value={s.sort_order} onChange={(e) => handleGradeRowChange(idx, 'sort_order', e.target.value)} className="grade-settings-input-13" />
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleRemoveGradeRow(idx)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {scales.length === 0 && (
                      <tr>
                        <td colSpan={8} className="grade-settings-td-14">
                          <Award size={32} className="grade-settings-Award-15" />
                          <p className="grade-settings-text-16">No grading scales defined yet. Click 'Load Default Scale' or add a custom row.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <button className="btn btn-outline" onClick={handleAddGradeRow} style={{ marginTop: '1rem' }}>
                  + Add Custom Grade Row
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
