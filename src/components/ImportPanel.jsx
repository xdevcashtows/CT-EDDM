import { useState } from 'react'
import './ImportPanel.css'

function ImportPanel({ onProcessData }) {
  const [inputData, setInputData] = useState('')

  const handleProcess = () => {
    if (!inputData.trim()) return

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
        size: parseFloat(values[sizeIdx] || '0') || 0,
        income: parseIncome(values[incomeIdx]),
        cost: parseCost(values[costIdx])
      }
    }).filter(row => row.route && row.route !== '') // Filter out empty rows

    onProcessData(data)
  }

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
      <button className="process-button" onClick={handleProcess}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" fill="currentColor"/>
        </svg>
        Process Data
      </button>
    </div>
  )
}

export default ImportPanel

