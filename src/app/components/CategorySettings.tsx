'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Category } from '../useCategories'

interface Props {
  categories: Category[]
  addCategory: (name: string, type: 'expense' | 'income') => void
  removeCategory: (id: string) => void
}

export default function CategorySettings({ categories, addCategory, removeCategory }: Props) {
  const { t } = useTranslation()
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'expense' | 'income'>('expense')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const expCats = categories.filter(c => c.type === 'expense')
  const incCats = categories.filter(c => c.type === 'income')

  const inputCls = "app-input flex-1 py-3 text-sm"

  return (
    <div className="app-panel p-4 sm:p-5">
      <div className="app-kicker mb-3">Categories</div>

      {/* Expense categories */}
      <div className="mb-3">
        <div className="mb-2 text-xs font-medium text-slate-500">{t('expenses')}</div>
        <div className="flex flex-wrap gap-1.5">
          {expCats.map(c => (
            <div key={c.id} className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-slate-900/70">
              <span className="text-sm text-slate-700 dark:text-zinc-300">{c.name}</span>
              {confirmId === c.id ? (
                <>
                  <button onClick={() => { removeCategory(c.id); setConfirmId(null) }}
                    className="text-xs text-red-500 ml-1">✓</button>
                  <button onClick={() => setConfirmId(null)}
                    className="text-xs text-slate-400">✕</button>
                </>
              ) : (
                <button onClick={() => setConfirmId(c.id)}
                  className="text-slate-300 dark:text-zinc-600 hover:text-red-400 text-xs ml-1">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Income categories */}
      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-slate-500">{t('income')}</div>
        <div className="flex flex-wrap gap-1.5">
          {incCats.map(c => (
            <div key={c.id} className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-slate-900/70">
              <span className="text-sm text-slate-700 dark:text-zinc-300">{c.name}</span>
              {confirmId === c.id ? (
                <>
                  <button onClick={() => { removeCategory(c.id); setConfirmId(null) }}
                    className="text-xs text-red-500 ml-1">✓</button>
                  <button onClick={() => setConfirmId(null)}
                    className="text-xs text-slate-400">✕</button>
                </>
              ) : (
                <button onClick={() => setConfirmId(c.id)}
                  className="text-slate-300 dark:text-zinc-600 hover:text-red-400 text-xs ml-1">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add new */}
      <div className="app-panel-soft flex flex-col gap-3 p-4">
        <div className="app-kicker">Add category</div>
        <div className="flex gap-2">
          <select value={newType} onChange={e => setNewType(e.target.value as 'expense' | 'income')}
            className="app-select flex-shrink-0 px-3 py-2.5 text-sm"
            style={{ fontSize: '16px' }}>
            <option value="expense">{t('expense')}</option>
            <option value="income">{t('income2')}</option>
          </select>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Category name" className={inputCls} style={{ fontSize: '16px' }}
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
