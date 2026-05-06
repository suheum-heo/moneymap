'use client'
import { createContext, useContext } from 'react'

export const UserContext = createContext<string | undefined>(undefined)

export function useUserId() {
  return useContext(UserContext)
}
