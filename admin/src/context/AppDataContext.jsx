import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const AppDataContext = createContext(null)

const emptyWidget = {
  primaryColor: '#1a1714',
  accentColor: '#a67c52',
  bubbleColor: '#f4efe6',
  textColor: '#1a1714',
  launcherColor: '#a67c52',
  assistantTone: 'professional',
}

export function AppDataProvider({ children }) {
  const [leads, setLeads] = useState([])
  const [conversations, setConversations] = useState([])
  const [knowledge, setKnowledge] = useState([])
  const [trainingJobs, setTrainingJobs] = useState([])
  const [widgetSettings, setWidgetSettings] = useState(emptyWidget)
  const [dbStatus, setDbStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await api.healthDb()
        const [leadsRes, convRes, knowledgeRes, trainingRes, widgetRes] = await Promise.all([
          api.getLeads(),
          api.getConversations(),
          api.getKnowledge(),
          api.getTraining(),
          api.getWidgetSettings(),
        ])
        if (!alive) return
        setLeads(leadsRes.items || [])
        setConversations(convRes.items || [])
        setKnowledge(knowledgeRes.items || [])
        setTrainingJobs(trainingRes.items || [])
        setWidgetSettings(widgetRes.item || emptyWidget)
        setDbStatus('connected')
        setError('')
      } catch (err) {
        if (!alive) return
        console.error(err)
        setDbStatus('error')
        setError(err.message || 'Could not load admin data from API')
        setLeads([])
        setConversations([])
        setKnowledge([])
        setTrainingJobs([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const addKnowledge = async (item) => {
    const { item: created } = await api.createKnowledge(item)
    setKnowledge((prev) => [created, ...prev])
    return created
  }

  const updateKnowledge = async (id, patch) => {
    const { item } = await api.updateKnowledge(id, patch)
    setKnowledge((prev) => prev.map((k) => (k.id === id ? item : k)))
  }

  const removeKnowledge = async (id) => {
    await api.deleteKnowledge(id)
    setKnowledge((prev) => prev.filter((k) => k.id !== id))
  }

  const queueTraining = async (job) => {
    const { item } = await api.createTraining(job)
    setTrainingJobs((prev) => [item, ...prev])
  }

  const processTrainingQueue = async () => {
    const { items } = await api.processTraining()
    setTrainingJobs(items || [])
  }

  const updateLeadStatus = async (id, status) => {
    const { item } = await api.updateLead(id, { status })
    setLeads((prev) => prev.map((l) => (l.id === id ? item : l)))
  }

  const saveWidgetSettings = async (next) => {
    setWidgetSettings(next)
    const { item } = await api.saveWidgetSettings(next)
    setWidgetSettings(item)
  }

  const value = useMemo(
    () => ({
      leads,
      setLeads,
      conversations,
      setConversations,
      knowledge,
      addKnowledge,
      updateKnowledge,
      removeKnowledge,
      trainingJobs,
      queueTraining,
      processTrainingQueue,
      setTrainingJobs,
      widgetSettings,
      setWidgetSettings,
      saveWidgetSettings,
      updateLeadStatus,
      dbStatus,
      error,
    }),
    [leads, conversations, knowledge, trainingJobs, widgetSettings, dbStatus, error]
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  return useContext(AppDataContext)
}
