'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCategories } from '../useCategories'

export default function CategorySettings() {
  const { t } = useTranslation()
  const { categories, addCategory, removeCategory } = useCategories()
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'expense' | 'income'>('expense')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const expCats = categories.filter(c => c.type === 'expense')
  const incCats = categories.filter(c => c.type === 'income')

  const inputCls = "flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"

  return (
    <div>
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">Categories</div>

      {/* Expense categories */}
      <div className="mb-3">
        <div className="text-xs text-zinc-500 mb-2 font-medium">{t('expenses')}</div>
        <div className="flex flex-wrap gap-1.5">
          {expCats.map(c => (
            <div key={c.id} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{c.name}</span>
              {confirmId === c.id ? (
                <>
                  <button onClick={() => { removeCategory(c.id); setConfirmId(null) }}
                    className="text-xs text-red-500 ml-1">✓</button>
                  <button onClick={() => setConfirmId(null)}
                    className="text-xs text-zinc-400">✕</button>
                </>
              ) : (
                <button onClick={() => setConfirmId(c.id)}
                  className="text-zinc-300 dark:text-zinc-600 hover:text-red-400 text-xs ml-1">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Income categories */}
      <div className="mb-4">
        <div className="text-xs text-zinc-500 mb-2 font-medium">{t('income')}</div>
        <div className="flex flex-wrap gap-1.5">
          {incCats.map(c => (
            <div key={c.id} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{c.name}</span>
              {confirmId === c.id ? (
                <>
                  <button onClick={() => { removeCategory(c.id); setConfirmId(null) }}
                    className="text-xs text-red-500 ml-1">✓</button>
                  <button onClick={() => setConfirmId(null)}
                    className="text-xs text-zinc-400">✕</button>
                </>
              ) : (
                <button onClick={() => setConfirmId(c.id)}
                  className="text-zinc-300 dark:text-zinc-600 hover:text-red-400 text-xs ml-1">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add new */}
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 flex flex-col gap-2">
        <div className="text-xs text-zinc-400 mb-1">Add category</div>
        <div className="flex gap-2">
          <select value={newType} onChange={e => setNewType(e.target.value as 'expense' | 'income')}
            className="px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm flex-shrink-0"
            style={{ fontSize: '16px' }}>
            <option value="expense">{t('expense')}</option>
            <option value="income">{t('income2')}</option>
          </select>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Category name" className={inputCls} style={{ fontSize: '16px' }}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) { addCategory(newName, newType); setNewName('') } }} />
        </div>
        <button onClick={() => { if (newName.trim()) { addCategory(newName, newType); setNewName('') } }}
          className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-medium">
          {t('save')}
        </button>
      </div>
    </div>
  )
}
