import { useState, useEffect, useRef } from 'react'
import './ImportPanel.css'

function ImportPanel({ onProcessData }) {
  const [inputData, setInputData] = useState('')
  const onProcessDataRef = useRef(onProcessData)

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onProcessDataRef.current = onProcessData
  }, [onProcessData])

  // Automatically process data when input changes (debounced)
  useEffect(() => {
    if (!inputData.trim()) return

    // Use a small delay to debounce rapid changes
    const timeoutId = setTimeout(() => {
      const lines = inputData.trim().split('\n')
      if (lines.length < 2) return

      // Parse header (first line)
      const headers = lines[0].split('\t').map(h => h.trim())
      
      // Find column indices
      const routeIdx = headers.findIndex(h => h.toLowerCase().includes('route'))
      const resIdx = headers.findIndex(h => h.toLowerCase().includes('residential') || h.toLowerCase().includes('res'))
      const busIdx = headers.findIndex(h => h.toLowerCase().includes('business') || h.toLowerCase().includes('bus'))
      const totalIdx = headers.findIndex(h => h.toLowerCase().includes('total'))
      const ageIdx = headers.findIndex(h => h.toLowerCase().includes('age'))
      const sizeIdx = headers.findIndex(h => h.toLowerCase().includes('size'))
      const incomeIdx = headers.findIndex(h => h.toLowerCase().includes('income'))
      const costIdx = headers.findIndex(h => h.toLowerCase().includes('cost'))

      // Extract age range from the age column header (e.g., "Age: 35-65" -> "35-65")
      let ageRange = null
      if (ageIdx !== -1 && headers[ageIdx]) {
        const ageHeader = headers[ageIdx]
        // Try to match patterns like "Age: 35-65", "Age 35-65", "Age 35-65%", etc.
        const rangeMatch = ageHeader.match(/(\d+)\s*[-–]\s*(\d+)/)
        if (rangeMatch) {
          ageRange = `${rangeMatch[1]}-${rangeMatch[2]}`
        }
      }

      // Helper function to parse income (removes $ and commas)
      const parseIncome = (value) => {
        if (!value || value.trim() === '' || value.trim() === '—') return 0
        return parseFloat(value.replace(/[$,]/g, '')) || 0
      }

      // Helper function to parse percentage (removes %)
      const parsePercentage = (value) => {
        if (!value || value.trim() === '' || value.trim() === '—' || value.trim() === '— %') return 0
        return parseFloat(value.replace('%', '')) || 0
      }

      // Helper function to parse number (handles dashes)
      const parseNumber = (value) => {
        if (!value || value.trim() === '' || value.trim() === '—') return 0
        return parseInt(value.replace(/,/g, ''), 10) || 0
      }

      // Helper function to parse cost (removes $)
      const parseCost = (value) => {
        if (!value || value.trim() === '' || value.trim() === '—') return 0
        return parseFloat(value.replace(/[$,]/g, '')) || 0
      }

      // Parse data rows
      const data = lines.slice(1).map((line, idx) => {
        const values = line.split('\t').map(v => v.trim())
        const residential = parseNumber(values[resIdx])
        const business = parseNumber(values[busIdx])
        const total = parseNumber(values[totalIdx])
        
        return {
          id: idx,
          route: values[routeIdx] || '',
          residential: residential,
          business: business,
          total: total || (residential + business), // Use total or calculate
          age: parsePercentage(values[ageIdx]),
          ageRange: ageRange, // Store the age range from header
          size: parseFloat(values[sizeIdx] || '0') || 0,
          income: parseIncome(values[incomeIdx]),
          cost: parseCost(values[costIdx])
        }
      }).filter(row => row.route && row.route !== '') // Filter out empty rows

      onProcessDataRef.current(data)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [inputData])

  return (
    <div className="import-panel">
      <div className="import-textarea-container">
        <textarea
          className="import-textarea"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          placeholder="Paste your tab-separated data here..."
        />
      </div>
    </div>
  )
}

export default ImportPanel

