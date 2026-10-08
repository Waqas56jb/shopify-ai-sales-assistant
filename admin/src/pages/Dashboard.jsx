import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts'
import { MessageSquare, Users, BookOpen, TrendingUp } from 'lucide-react'
import { useAppData } from '../context/AppDataContext'

function buildChartSeries(conversations, leads) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  const series = []

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = days[d.getDay()]
    const chats = conversations.filter((c) => String(c.updatedAt || '').slice(0, 10) === key).length
    const dayLeads = leads.filter((l) => String(l.createdAt || '').slice(0, 10) === key).length
    series.push({ day: label, chats, leads: dayLeads })
  }

  return series
}

export default function Dashboard() {
  const { leads, conversations, knowledge, trainingJobs, dbStatus, error } = useAppData()
  const openChats = conversations.filter((c) => c.status === 'open' || c.status === 'handed_off').length
  const trained = knowledge.filter((k) => k.trained).length
  const chartSeries = buildChartSeries(conversations, leads)

  const stats = [
    { label: 'Open chats', value: openChats, delta: `${conversations.length} total`, icon: MessageSquare },
    { label: 'Leads', value: leads.length, delta: dbStatus === 'connected' ? 'Live Supabase' : 'API offline', icon: Users },
    { label: 'Knowledge items', value: knowledge.length, delta: `${trained} trained`, icon: BookOpen },
    { label: 'Training jobs', value: trainingJobs.length, delta: 'From database', icon: TrendingUp },
  ]

  return (
    <>
      {error && <div className="supabase-note mb-12">{error}</div>}

      <div className="grid-stats">
        {stats.map(({ label, value, delta, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <div className="label">
              <span>{label}</span>
              <Icon size={16} color="#a67c52" />
            </div>
            <div className="value">{value}</div>
            <div className="delta">{delta}</div>
          </div>
        ))}
      </div>

      <div className="charts">
        <div className="panel">
          <div className="panel-head">
            <h3>Chats & leads</h3>
            <span>Last 7 days (live)</span>
          </div>
          <div className="chart-box">
            <ResponsiveContainer>
              <AreaChart data={chartSeries}>
                <defs>
                  <linearGradient id="chats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a67c52" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#a67c52" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,20,17,0.08)" />
                <XAxis dataKey="day" stroke="#5c534a" fontSize={12} />
                <YAxis stroke="#5c534a" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="chats" stroke="#a67c52" fill="url(#chats)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="leads" stroke="#1a1714" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Lead volume</h3>
            <span>Daily</span>
          </div>
          <div className="chart-box">
            <ResponsiveContainer>
              <BarChart data={chartSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,20,17,0.08)" />
                <XAxis dataKey="day" stroke="#5c534a" fontSize={12} />
                <YAxis stroke="#5c534a" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="leads" fill="#1a1714" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  )
}
