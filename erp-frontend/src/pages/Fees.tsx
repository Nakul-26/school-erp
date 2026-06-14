import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { Plus, CreditCard, Search, Download } from 'lucide-react'

interface FeeRecord {
  id: number;
  student_name: string;
  roll_number: string;
  fee_type: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  due_date: string;
  academic_year: string;
}

export default function Fees() {
  const [records, setRecords] = useState<FeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch('/fees/records', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
      })
      const data = await res.json()
      setRecords(data.records)
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecord) return

    try {
      const res = await fetch('/fees/pay', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('erp_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fee_record_id: selectedRecord.id,
          amount: payAmount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_mode: 'Cash'
        })
      })
      if (res.ok) {
        setShowPayModal(false)
        fetchRecords()
        alert('Payment recorded successfully')
      }
    } catch (err) {
      alert('Error recording payment')
    }
  }

  const filteredRecords = records.filter(r => 
    r.student_name.toLowerCase().includes(search.toLowerCase()) || 
    r.roll_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <div className="page-header">
        <h1>Fee Management</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline">Generate Dues</button>
          <button className="btn btn-primary"><Plus size={18} /> Add Fee Structure</button>
        </div>
      </div>

      <div className="filters card">
        <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
            <input 
              type="text" 
              placeholder="Search by student name or roll number..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '35px' }}
            />
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? <p>Loading fee records...</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Fee Type</th>
                <th>Academic Year</th>
                <th>Amount Due</th>
                <th>Amount Paid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(r => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.student_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{r.roll_number}</div>
                  </td>
                  <td>{r.fee_type}</td>
                  <td>{r.academic_year}</td>
                  <td>${r.amount_due}</td>
                  <td>${r.amount_paid}</td>
                  <td>
                    <span className={`badge badge-${r.status === 'paid' ? 'success' : (r.status === 'partial' ? 'warning' : 'danger')}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-sm" 
                        onClick={() => { setSelectedRecord(r); setPayAmount(r.amount_due - r.amount_paid); setShowPayModal(true); }}
                        disabled={r.status === 'paid'}
                      >
                        <CreditCard size={14} /> Pay
                      </button>
                      <button className="btn btn-sm btn-outline">
                        <Download size={14} /> Receipt
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPayModal && selectedRecord && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Record Payment</h3>
            <p>Recording payment for <strong>{selectedRecord.student_name}</strong> - {selectedRecord.fee_type}</p>
            <form onSubmit={handlePayment}>
              <div className="input-group">
                <label>Amount to Pay</label>
                <input 
                  type="number" 
                  max={selectedRecord.amount_due - selectedRecord.amount_paid} 
                  value={payAmount} 
                  onChange={e => setPayAmount(parseFloat(e.target.value))}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
