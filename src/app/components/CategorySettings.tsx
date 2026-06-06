'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getCategoryColor } from '../types'
import { Category } from '../useCategories'

interface Props {
  categories: Category[]
  addCategory: (name: string, type: 'expense' | 'income') => void
  updateCategory: (id: string, name: string) => void | Promise<void>
  removeCategory: (id: string) => void
}

export default function CategorySettings({ categories, addCategory, updateCategory, removeCategory }: Props) {
  const { t } = useTranslation()
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'expense' | 'income'>('expense')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const expCats = categories.filter(c => c.type === 'expense')
  const incCats = categories.filter(c => c.type === 'income')

  const inputCls = "app-input flex-1 py-3 text-sm"
  const normalized = (value: string) => value.trim().toLocaleLowerCase()

  const startEditing = (category: Category) => {
    setConfirmId(null)
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const stopEditing = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveEdit = () => {
    if (!editingId) return
    const current = categories.find(category => category.id === editingId)
    const trimmed = editingName.trim()
    if (!current || !trimmed) return
    if (normalized(trimmed) === normalized(current.name)) {
      stopEditing()
      return
    }
    if (categories.some(category => category.id !== editingId && category.type === current.type && normalized(category.name) === normalized(trimmed))) return
    void updateCategory(editingId, trimmed)
    stopEditing()
  }

  const renderCategoryGroup = (items: Category[], label: string) => (
    <div className="mb-3">
      <div className="mb-2 text-xs font-medium text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(category => {
          const isEditing = editingId === category.id
          const duplicateName = isEditing
            && categories.some(item => item.id !== category.id && item.type === category.type && normalized(item.name) === normalized(editingName))

          return (
            <div key={category.id} className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-slate-900/70">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(category.name, category.type) }} />
                  <input
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    className="min-w-[7rem] bg-transparent text-sm text-slate-700 outline-none dark:text-zinc-200"
                    style={{ fontSize: '16px' }}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter' && editingName.trim() && !duplicateName) saveEdit()
                      if (e.key === 'Escape') stopEditing()
                    }}
                  />
                  <button
                    onClick={saveEdit}
                    disabled={!editingName.trim() || duplicateName}
                    className="app-accent text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('save')}
                  </button>
                  <button onClick={stopEditing} className="text-xs text-slate-400">{t('cancel')}</button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: getCategoryColor(category.name, category.type) }} />
                  <span className="text-sm text-slate-700 dark:text-zinc-300">{category.name}</span>
                  <button
                    onClick={() => startEditing(category)}
                    className="app-accent ml-1 text-xs font-medium"
                  >
                    {t('edit')}
                  </button>
                  {confirmId === category.id ? (
                    <>
                      <button onClick={() => { removeCategory(category.id); setConfirmId(null) }}
                        className="ml-1 text-xs text-red-500">✓</button>
                      <button onClick={() => setConfirmId(null)}
                        className="text-xs text-slate-400">✕</button>
                    </>
                  ) : (
                    <button onClick={() => { setEditingId(null); setConfirmId(category.id) }}
                      className="ml-1 text-xs text-slate-300 hover:text-red-400 dark:text-zinc-600">✕</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="app-panel p-4 sm:p-5">
      <div className="app-kicker mb-3">{t('categoriesLabel')}</div>

      {renderCategoryGroup(expCats, t('expenses'))}
      {renderCategoryGroup(incCats, t('income'))}

      {/* Add new */}
      <div className="app-panel-soft flex flex-col gap-3 p-4">
        <div className="app-kicker">{t('addCategory')}</div>
        <div className="flex gap-2">
          <select value={newType} onChange={e => setNewType(e.target.value as 'expense' | 'income')}
            className="app-select flex-shrink-0 px-3 py-2.5 text-sm"
            style={{ fontSize: '16px' }}>
            <option value="expense">{t('expense')}</option>
            <option value="income">{t('income2')}</option>
          </select>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder={t('categoryNamePlaceholder')} className={inputCls} style={{ fontSize: '16px' }}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { addCategory(newName, newType); setNewName('') } }} />
        </div>
        <button onClick={() => { if (newName.trim()) { addCategory(newName, newType); setNewName('') } }}
          className="app-button-primary w-full">
          {t('save')}
        </button>
      </div>
    </div>
  )
}
