import { useAppData } from '../context/AppDataContext'

export default function Conversations() {
  const { conversations } = useAppData()

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Recent conversations</h3>
        <span>{conversations.length} threads</span>
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Visitor</th>
              <th>Channel</th>
              <th>Last message</th>
              <th>Messages</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.visitor}</strong>
                </td>
                <td>{c.channel}</td>
                <td className="cell-clamp">{c.lastMessage}</td>
                <td>{c.messages}</td>
                <td>
                  <span className={`badge ${c.status}`}>{c.status.replace('_', ' ')}</span>
                </td>
                <td>{c.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
