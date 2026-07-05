import './GradeSettings.css';
import React, { useEffect, useState } from 'react';
import { PageGuidance } from '../components/PageGuidance';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { Award, Save, RefreshCw } from 'lucide-react';

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

export default function GradeSettings() {
  const [scales, setScales] = useState<GradeScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchScales();
  }, []);

  const fetchScales = async () => {
    try {
      setLoading(true);
      const data = await api.get('/grades/scales');
      setScales(data);
    } catch (err) {
      console.error('Error fetching grade scales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDefaults = async () => {
    if (!confirm('Are you sure you want to load default grading scales? This will overwrite your current configuration.')) {
      return;
    }
    try {
      setSaving(true);
      await api.post('/grades/scales/seed', {});
      alert('Default grading scales loaded successfully!');
      fetchScales();
    } catch (err) {
      alert('Error loading defaults');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRowChange = (index: number, field: keyof GradeScale, value: any) => {
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

  const handleSave = async () => {
    try {
      setSaving(true);
      // Validate sort orders and percentages
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
      alert('Grading scales updated successfully!');
      fetchScales();
    } catch (err: any) {
      alert(err.message || 'Error saving grading scales');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRow = () => {
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

  const handleRemoveRow = (index: number) => {
    setScales(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Layout>
      <PageGuidance
        title="Grade Settings"
        description="Use this page to decide how exam marks are converted into grades like A+, A, B, and C. These settings are used automatically while preparing exam results and report cards."
        steps={["Set percentage limits (Min% and Max%) and link them to letter grades.","Click Load Default Scale to fill standard grading schemes.","Click Save Changes to apply settings across all school exams."]}
      />
      <div className="page-header">
        <div>
          <h2>Grade Settings</h2>
          <p className="grade-settings-text-1">
            Configure default marks-to-grade scaling ranges used across exams and report card generation.
          </p>
        </div>
        <div className="grade-settings-row-2">
          <button className="btn btn-outline" onClick={handleLoadDefaults} disabled={loading || saving}>
            <RefreshCw size={16} className="grade-settings-RefreshCw-3"  /> Load Default Scale
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || saving || scales.length === 0}>
            <Save size={16} className="grade-settings-Save-4"  /> Save Changes
          </button>
        </div>
      </div>

      

      <div className="card grade-settings-card">
        {loading ? <p>Loading grade scale configuration...</p> : (
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
                      <input type="text" value={s.grade} onChange={(e) => handleRowChange(idx, 'grade', e.target.value)} placeholder="e.g. A+" className="grade-settings-input-7"  />
                    </td>
                    <td>
                      <input type="number" value={s.min_percent} onChange={(e) => handleRowChange(idx, 'min_percent', e.target.value)} className="grade-settings-input-8"  />
                    </td>
                    <td>
                      <input type="number" value={s.max_percent} onChange={(e) => handleRowChange(idx, 'max_percent', e.target.value)} className="grade-settings-input-9"  />
                    </td>
                    <td>
                      <input type="number" step="0.1" value={s.grade_point} onChange={(e) => handleRowChange(idx, 'grade_point', e.target.value)} className="grade-settings-input-10"  />
                    </td>
                    <td>
                      <input type="text" value={s.remarks || ''} onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)} placeholder="e.g. Outstanding" className="grade-settings-input-11"  />
                    </td>
                    <td>
                      <select value={s.is_passing} onChange={(e) => handleRowChange(idx, 'is_passing', e.target.value)} className="grade-settings-select-12">
                        <option value={1}>Pass</option>
                        <option value={0}>Fail</option>
                      </select>
                    </td>
                    <td>
                      <input type="number" value={s.sort_order} onChange={(e) => handleRowChange(idx, 'sort_order', e.target.value)} className="grade-settings-input-13"  />
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline btn-danger" onClick={() => handleRemoveRow(idx)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {scales.length === 0 && (
                  <tr>
                    <td colSpan={8} className="grade-settings-td-14">
                      <Award size={32} className="grade-settings-Award-15"  />
                      <p className="grade-settings-text-16">No grading scales defined yet. Click 'Load Default Scale' or add a custom row.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <button className="btn btn-outline" onClick={handleAddRow}>
              + Add Custom Grade Row
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
