import { useAppData } from '../context/AppDataContext'

export default function Leads() {
  const { leads, updateLeadStatus, dbStatus } = useAppData()

  function updateStatus(id, status) {
    updateLeadStatus(id, status)
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Captured leads</h3>
        <span>
          {leads.length} total · {dbStatus === 'connected' ? 'Supabase' : 'Local'}
        </span>
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Message</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <strong>{lead.name}</strong>
                </td>
                <td>
                  {lead.email}
                  <br />
                  <span className="muted">{lead.phone}</span>
                </td>
                <td className="cell-clamp">{lead.message}</td>
                <td>
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    aria-label={`Status for ${lead.name}`}
                  >
                    <option value="new">new</option>
                    <option value="contacted">contacted</option>
                    <option value="qualified">qualified</option>
                  </select>
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge ${lead.status}`}>{lead.status}</span>
                  </div>
                </td>
                <td>{lead.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
