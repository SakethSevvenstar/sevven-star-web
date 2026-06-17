'use client'

import { useEffect, useState } from 'react'
import { readFromDb, insertToDb, updateInDb, deleteFromDb } from '@/lib/supabase'
import FloorApp from '@/components/FloorApp'

export default function Page() {
  const [cfg, setCfg] = useState(null)
  const [con, setCon] = useState([])
  const [down, setDown] = useState([])
  const [loading, setLoading] = useState(true)
  const [supabaseReady, setSupabaseReady] = useState(true)

  async function load() {
    try {
      const [machines, grades, lots, consumption, downtime] = await Promise.all([
        readFromDb('machines'),
        readFromDb('grades'),
        readFromDb('lots'),
        readFromDb('consumption'),
        readFromDb('downtime'),
      ])
      
      setCfg({
        seeded: true,
        demo: false,
        machines: machines || [],
        grades: grades.map(g => g.name) || [],
        lots: lots || [],
        params: {
          leadTimeDays: 7,
          orderingCost: 1500,
          holdingCostPerKgYr: 18,
          serviceZ: 1.65,
          opHoursPerDay: 16,
        },
      })
      
      setCon(consumption || [])
      setDown(downtime || [])
      setSupabaseReady(true)
    } catch (e) {
      console.error('Load error:', e)
      setSupabaseReady(false)
      setCfg({ seeded: true, demo: false, machines: [], grades: [], lots: [], params: {} })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return <div className="loading">Loading floor data</div>
  }

  if (!cfg) {
    return <div className="loading">Error loading data</div>
  }

  return (
    <FloorApp
      initialCfg={cfg}
      initialCon={con}
      initialDown={down}
      supabaseReady={supabaseReady}
      onLoad={load}
    />
  )
}
