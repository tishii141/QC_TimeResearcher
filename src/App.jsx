import { useState, useEffect } from 'react'
import { sb } from './supabase'
import Auth from './components/Auth'
import Header from './components/Header'
import Timer from './components/Timer'
import Report from './components/Report'
import Categories from './components/Categories'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = loading, null = not logged in
  const [activeTab, setActiveTab] = useState('timer')
  const [categories, setCategories] = useState([])
  const [records, setRecords] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
        setCategories([])
        setRecords([])
        setDataLoaded(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    setDataLoaded(false)
    const [catRes, recRes] = await Promise.all([
      sb.from('categories').select('*').order('major').order('minor'),
      sb.from('records').select('*').order('start_time', { ascending: false }),
    ])
    if (catRes.data) {
      setCategories(catRes.data.map(r => ({ id: r.id, major: r.major, minor: r.minor })))
    }
    if (recRes.data) {
      setRecords(recRes.data.map(r => ({
        id: r.id,
        categoryId: r.category_id,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        duration: Number(r.duration),
      })))
    }
    setDataLoaded(true)
  }

  // Still checking auth state
  if (user === undefined) return <LoadingScreen />

  // Not logged in
  if (user === null) return <Auth />

  // Logged in but data not loaded yet
  if (!dataLoaded) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-slate-50">
      <Header activeTab={activeTab} onTabChange={setActiveTab} userEmail={user.email} />
      <main className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'timer' && (
          <Timer
            categories={categories}
            user={user}
            onRecordAdded={loadData}
          />
        )}
        {activeTab === 'report' && (
          <Report
            records={records}
            categories={categories}
          />
        )}
        {activeTab === 'category' && (
          <Categories
            categories={categories}
            user={user}
            records={records}
            onUpdate={loadData}
          />
        )}
      </main>
    </div>
  )
}
