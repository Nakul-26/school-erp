import React from 'react';

interface ResultsTabProps {
  studentExams: any[];
  selectedExamId: string;
  setSelectedExamId: (id: string) => void;
  loadingResult: boolean;
  detailedResult: any;
}

export function ResultsTab({ studentExams, selectedExamId, setSelectedExamId, loadingResult, detailedResult }: ResultsTabProps) {
  return (
    <div>
      <h3 className="student-details-title-107">Exam Performance</h3>
      {studentExams.length === 0 ? (
        <p className="student-details-text-108">No examinations recorded for this student.</p>
      ) : (
        <div>
          <div className="form-group student-details-form-group">
            <label>Select Examination</label>
            <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
              {studentExams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>

          {loadingResult ? (
            <p>Fetching result card details...</p>
          ) : detailedResult ? (
            <div>
              <div className="student-details-grid-110">
                <div>
                  <span className="student-details-span-111">Total Marks Obtained</span>
                  <strong className="student-details-strong-112">{detailedResult.total_obtained} / {detailedResult.total_max}</strong>
                </div>
                <div>
                  <span className="student-details-span-113">Aggregated Percentage</span>
                  <strong className="student-details-strong-114">{detailedResult.percentage}%</strong>
                </div>
                <div>
                  <span className="student-details-span-115">Grade</span>
                  <strong className="student-details-strong-116">{detailedResult.grade}</strong>
                </div>
                <div>
                  <span className="student-details-span-117">Result Status</span>
                  <span className={`badge badge-${detailedResult.result === 'PASS' ? 'success' : 'danger'}`}>
                    {detailedResult.result}
                  </span>
                </div>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Marks Obtained</th>
                    <th>Maximum Marks</th>
                    <th>Passing Threshold</th>
                    <th>Subject Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedResult.subjects?.map((sub: any) => (
                    <tr key={sub.subject_id}>
                      <td><strong>{sub.subject_code}</strong></td>
                      <td>{sub.subject_name}</td>
                      <td><strong>{sub.marks_obtained}</strong></td>
                      <td>{sub.max_marks}</td>
                      <td>{sub.min_marks}</td>
                      <td>
                        <span className={`badge badge-${sub.status === 'PASS' ? 'success' : 'danger'}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td>{sub.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="student-details-text-118">No evaluation records entered for this student in the selected exam.</p>
          )}
        </div>
      )}
    </div>
  );
}
