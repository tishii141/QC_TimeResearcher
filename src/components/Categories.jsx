import { useState } from 'react'
import { sb } from '../supabase'
import { uid, groupByMajor } from '../utils'

export default function Categories({ categories, user, records, onUpdate }) {
  const [majorInput, setMajorInput] = useState('')
  const [minorInput, setMinorInput] = useState('')
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const byMajor = groupByMajor([...categories].sort((a, b) =>
    a.major.localeCompare(b.major) || a.minor.localeCompare(b.minor)
  ))
  const majors = Object.keys(byMajor).sort()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editId) {
        const { error } = await sb.from('categories')
          .update({ major: majorInput.trim(), minor: minorInput.trim() })
          .eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await sb.from('categories').insert({
          id: uid(),
          user_id: user.id,
          major: majorInput.trim(),
          minor: minorInput.trim(),
        })
        if (error) throw error
      }
      resetForm()
      onUpdate()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat) {
    const inUse = records.some(r => r.categoryId === cat.id)
    if (inUse) {
      alert(`「${cat.major} / ${cat.minor}」は記録に使用されているため削除できません。`)
      return
    }
    if (!confirm(`「${cat.major} / ${cat.minor}」を削除しますか？`)) return
    const { error } = await sb.from('categories').delete().eq('id', cat.id)
    if (error) { alert(error.message); return }
    onUpdate()
  }

  function startEdit(cat) {
    setEditId(cat.id)
    setMajorInput(cat.major)
    setMinorInput(cat.minor)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditId(null)
    setMajorInput('')
    setMinorInput('')
    setError('')
  }

  return (
    <div className="space-y-4">
      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          {editId ? 'カテゴリを編集' : 'カテゴリを追加'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 flex-shrink-0">大分類</label>
            <input
              type="text"
              required
              value={majorInput}
              onChange={e => setMajorInput(e.target.value)}
              placeholder="例：検査、打合せ、資料作成"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 flex-shrink-0">中分類</label>
            <input
              type="text"
              required
              value={minorInput}
              onChange={e => setMinorInput(e.target.value)}
              placeholder="例：外観検査、朝礼、報告書"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
            >
              {saving ? '保存中...' : editId ? '更新' : '追加'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">カテゴリ一覧</h2>
        {categories.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">カテゴリが登録されていません</p>
        ) : (
          <div className="space-y-3">
            {majors.map(major => (
              <div key={major}>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                  {major}
                </div>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  {byMajor[major].map((cat, idx) => (
                    <div
                      key={cat.id}
                      className={`flex items-center justify-between px-4 py-2.5 ${
                        idx !== byMajor[major].length - 1 ? 'border-b border-gray-50' : ''
                      } hover:bg-gray-50`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                        <span className="text-sm text-gray-800">{cat.minor}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(cat)}
                          className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-300 px-2.5 py-1 rounded-md transition"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-2.5 py-1 rounded-md transition"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
