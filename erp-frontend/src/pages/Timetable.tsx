import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { Info } from 'lucide-react'

interface TimetableSlot {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  room: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Timetable() {
  const [timetable, setTimetable] = useState<TimetableSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const user = JSON.parse(localStorage.getItem('erp_user') || '{}')

  useEffect(() => {
    fetchTimetable()
  }, [])

  const fetchTimetable = async () => {
    try {
      const res = await fetch('/timetable/my', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('erp_token')}` }
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch timetable')
      }
      
      setTimetable(data.timetable || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Organize timetable by day
  const scheduleByDay: Record<number, TimetableSlot[]> = {}
  if (Array.isArray(timetable)) {
    timetable.forEach(slot => {
      if (!scheduleByDay[slot.day_of_week]) scheduleByDay[slot.day_of_week] = []
      scheduleByDay[slot.day_of_week].push(slot)
    })
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>My Weekly Timetable</h1>
      </div>

      {loading ? <p>Loading timetable...</p> : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Info size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No Personal Timetable</h3>
          <p style={{ color: '#666', maxWidth: '400px', margin: '0.5rem auto' }}>
            {user.role === 'admin' 
              ? "As an Admin, you don't have a personal class schedule. You can manage schedules for different sections in the Students or Sections module."
              : error}
          </p>
        </div>
      ) : (
        <div className="timetable-grid">
          {DAYS.map((day, index) => {
            const slots = scheduleByDay[index + 1] || []
            return (
              <div key={day} className="day-column card">
                <h3>{day}</h3>
                <div className="slots">
                  {slots.length > 0 ? slots.map(slot => (
                    <div key={slot.id} className="slot-item">
                      <div className="time">{slot.start_time} - {slot.end_time}</div>
                      <div className="subject"><strong>{slot.subject_name}</strong></div>
                      <div className="details">
                        <span>{slot.teacher_name}</span>
                        {slot.room && <span> • Room: {slot.room}</span>}
                      </div>
                    </div>
                  )) : <p className="no-slots">No classes</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .timetable-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          align-items: start;
        }
        .day-column h3 {
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--primary);
          color: var(--primary);
        }
        .slot-item {
          padding: 0.75rem;
          border-radius: 4px;
          background: #f9f9f9;
          margin-bottom: 0.75rem;
          border-left: 4px solid var(--primary);
        }
        .slot-item .time {
          font-size: 0.75rem;
          color: #666;
          margin-bottom: 0.25rem;
        }
        .slot-item .subject {
          margin-bottom: 0.25rem;
        }
        .slot-item .details {
          font-size: 0.75rem;
          color: #888;
        }
        .no-slots {
          color: #999;
          font-style: italic;
          font-size: 0.875rem;
        }
      `}</style>
    </Layout>
  )
}
