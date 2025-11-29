/**
 * Optimizes route selection to get as close as possible to target piece count
 * while maximizing income. Can choose lower income routes if they help get closer to target.
 * 
 * Algorithm:
 * - Sorts routes by income (descending) as primary priority
 * - For each batch, finds the best combination that gets closest to target
 * - Uses a scoring system that balances proximity to target and total income
 * - Handles multi-batch optimization for targets >= 10,000
 */
export function optimizeRoutes(routes, targetPostcards, residentialOnly = false) {
  if (!routes || routes.length === 0) return { routeIds: [], batchMap: {} }

  // Filter routes based on residential only option
  let availableRoutes = routes
  if (residentialOnly) {
    availableRoutes = routes.filter(route => route.residential > 0)
  }

  // Filter out routes with no addresses (like PBOX routes with dashes or $0 income)
  availableRoutes = availableRoutes.filter(route => route.total > 0 && route.income > 0)

  if (availableRoutes.length === 0) return { routeIds: [], batchMap: {} }

  const BATCH_SIZE = 5000

  // Helper to get piece count for a route
  const getPieceCount = (route) => {
    return residentialOnly ? (route.residential ?? 0) : (route.total ?? 0)
  }

  // Sort routes by income (descending), then by piece count (descending) as tiebreaker
  const sortedRoutes = [...availableRoutes].sort((a, b) => {
    const incomeDiff = (b.income ?? 0) - (a.income ?? 0)
    if (Math.abs(incomeDiff) > 1000) {
      return incomeDiff
    }
    // If income difference is small, prefer routes with more pieces
    return getPieceCount(b) - getPieceCount(a)
  })

  // Determine number of batches needed
  const isMultiBatch = targetPostcards >= 10000
  const numBatches = targetPostcards >= 15000 ? 3 : targetPostcards >= 10000 ? 2 : 1

  // Function to find best combination for a single batch
  const findBestCombination = (candidateRoutes, targetPieces) => {
    if (candidateRoutes.length === 0) return { selectedIds: [], totalPieces: 0, totalIncome: 0 }

    // Score function: higher is better
    // Penalizes distance from target, rewards income
    const score = (pieces, income, target) => {
      const distanceFromTarget = Math.abs(pieces - target)
      // Penalty weight: 0.1 means we'd trade 10 pieces of accuracy for 1 unit of income
      // Adjust this to balance between accuracy and income
      const penaltyWeight = 0.1
      return income - (distanceFromTarget * penaltyWeight)
    }

    // Try multiple strategies and pick the best
    let bestResult = { selectedIds: [], totalPieces: 0, totalIncome: 0, score: -Infinity }

    // Strategy 1: Greedy from highest income, stopping when we get close
    const tryGreedy = () => {
      const selected = []
      let totalPieces = 0
      let totalIncome = 0

      for (const route of candidateRoutes) {
        const pieces = getPieceCount(route)
        const newTotal = totalPieces + pieces
        
        // If adding this route gets us closer to target, add it
        const currentDistance = Math.abs(totalPieces - targetPieces)
        const newDistance = Math.abs(newTotal - targetPieces)
        
        if (newDistance <= currentDistance || totalPieces < targetPieces) {
          selected.push(route.id)
          totalPieces = newTotal
          totalIncome += route.income ?? 0
        }
      }

      const resultScore = score(totalPieces, totalIncome, targetPieces)
      if (resultScore > bestResult.score) {
        bestResult = { selectedIds: selected, totalPieces, totalIncome, score: resultScore }
      }
    }

    // Strategy 2: Try to get exactly at or just over target
    const tryExactMatch = () => {
      const selected = []
      let totalPieces = 0
      let totalIncome = 0

      for (const route of candidateRoutes) {
        const pieces = getPieceCount(route)
        if (totalPieces + pieces <= targetPieces * 1.1) { // Allow up to 10% over
          selected.push(route.id)
          totalPieces += pieces
          totalIncome += route.income ?? 0
          
          // If we're at or over target, try to optimize by removing lower income routes
          if (totalPieces >= targetPieces) {
            // Try removing routes to get closer
            for (let i = selected.length - 1; i >= 0; i--) {
              const routeId = selected[i]
              const route = candidateRoutes.find(r => r.id === routeId)
              if (route) {
                const routePieces = getPieceCount(route)
                const newTotal = totalPieces - routePieces
                const currentDistance = Math.abs(totalPieces - targetPieces)
                const newDistance = Math.abs(newTotal - targetPieces)
                
                // Remove if it gets us closer to target
                if (newDistance < currentDistance && newTotal >= targetPieces * 0.9) {
                  selected.splice(i, 1)
                  totalPieces = newTotal
                  totalIncome -= route.income ?? 0
                }
              }
            }
            break
          }
        }
      }

      const resultScore = score(totalPieces, totalIncome, targetPieces)
      if (resultScore > bestResult.score) {
        bestResult = { selectedIds: selected, totalPieces, totalIncome, score: resultScore }
      }
    }

    // Strategy 3: Try combinations that get closest to target (with backtracking for small sets)
    const tryBacktracking = () => {
      if (candidateRoutes.length > 20) return // Skip for large sets (performance)

      const best = { selectedIds: [], totalPieces: 0, totalIncome: 0, score: -Infinity }

      const backtrack = (index, currentSelected, currentPieces, currentIncome) => {
        if (index >= candidateRoutes.length) {
          const resultScore = score(currentPieces, currentIncome, targetPieces)
          if (resultScore > best.score) {
            best.selectedIds = [...currentSelected]
            best.totalPieces = currentPieces
            best.totalIncome = currentIncome
            best.score = resultScore
          }
          return
        }

        const route = candidateRoutes[index]
        const pieces = getPieceCount(route)

        // Try without this route
        backtrack(index + 1, currentSelected, currentPieces, currentIncome)

        // Try with this route (if it doesn't exceed target too much)
        if (currentPieces + pieces <= targetPieces * 1.2) {
          backtrack(
            index + 1,
            [...currentSelected, route.id],
            currentPieces + pieces,
            currentIncome + (route.income ?? 0)
          )
        }
      }

      backtrack(0, [], 0, 0)

      if (best.score > bestResult.score) {
        bestResult = best
      }
    }

    // Run all strategies
    tryGreedy()
    tryExactMatch()
    tryBacktracking()

    return bestResult
  }

  // Create a working copy of routes with selection state
  const workingRoutes = availableRoutes.map(route => ({
    ...route,
    selected: false,
    batchNumber: undefined
  }))

  // Process each batch
  let remainingRoutes = sortedRoutes
  const batchResults = []

  for (let batchIdx = 1; batchIdx <= numBatches; batchIdx++) {
    const batchTarget = isMultiBatch ? BATCH_SIZE : targetPostcards
    
    // Find best combination for this batch
    const result = findBestCombination(remainingRoutes, batchTarget)
    
    // Mark selected routes
    result.selectedIds.forEach(routeId => {
      const workingRoute = workingRoutes.find(r => r.id === routeId)
      if (workingRoute) {
        workingRoute.selected = true
        workingRoute.batchNumber = batchIdx
      }
    })

    batchResults.push(result)
    
    // Remove selected routes from remaining pool
    remainingRoutes = remainingRoutes.filter(r => !result.selectedIds.includes(r.id))
  }

  // Return object with selected route IDs and their batch numbers
  const selectedRoutes = workingRoutes.filter(route => route.selected)
  return {
    routeIds: selectedRoutes.map(route => route.id),
    batchMap: selectedRoutes.reduce((map, route) => {
      map[route.id] = route.batchNumber
      return map
    }, {})
  }
}
