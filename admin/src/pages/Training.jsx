import { useState } from 'react'
import { FileText, Image, Database, Upload, Play } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'

export default function Training() {
  const { trainingJobs, queueTraining, processTrainingQueue, knowledge, dbStatus } = useAppData()
  const [notes, setNotes] = useState('')

  function queue(sourceType, label) {
    queueTraining({
      sourceType,
      label,
      notes: notes || `Training from ${sourceType} source`,
      status: 'queued',
    })
    setNotes('')
  }

  function runQueued() {
    processTrainingQueue()
  }

  return (
    <>
      <div className="train-grid">
        <div className="train-card">
          <FileText size={22} color="#a67c52" />
          <h4>Text training</h4>
          <p>Policies, FAQs, product descriptions, and support scripts.</p>
          <button className="btn-primary" type="button" onClick={() => queue('text', 'Text corpus upload')}>
            <Upload size={15} />
            Queue text
          </button>
        </div>
        <div className="train-card">
          <Image size={22} color="#a67c52" />
          <h4>Image training</h4>
          <p>Product photos and visual references for better recommendations.</p>
          <button className="btn-primary" type="button" onClick={() => queue('image', 'Image set upload')}>
            <Upload size={15} />
            Queue images
          </button>
        </div>
        <div className="train-card">
          <Database size={22} color="#a67c52" />
          <h4>Structured data</h4>
          <p>Prices, SKUs, categories, and ordered knowledge records.</p>
          <button
            className="btn-primary"
            type="button"
            onClick={() =>
              queue('structured', `Sync ${knowledge.length} knowledge items`)
            }
          >
            <Upload size={15} />
            Queue data
          </button>
        </div>
      </div>

      <div className="panel mt-14">
        <div className="panel-head">
          <h3>Training controls · {dbStatus === 'connected' ? 'Supabase' : 'Local'}</h3>
          <button className="btn-secondary" type="button" onClick={runQueued}>
            <Play size={15} />
            Process queue
          </button>
        </div>
        <div className="field mb-12">
          <label>Notes for next job</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes: what should the assistant learn?"
          />
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Source</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {trainingJobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong>{job.label}</strong>
                  </td>
                  <td>{job.sourceType}</td>
                  <td>
                    <span className={`badge ${job.status}`}>{job.status}</span>
                  </td>
                  <td className="cell-clamp">{job.notes}</td>
                  <td>{job.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="supabase-note">
          Training jobs and knowledge sync through the backend API into Supabase tables prefixed with
          shopify_store_database_.
        </div>
      </div>
    </>
  )
}
