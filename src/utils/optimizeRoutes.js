/**
 * Optimizes route selection to get as close as possible to target piece count
 * while maximizing income. Can choose lower income routes if they help get closer to target.
 * 
 * Algorithm:
 * - Sorts routes by income (descending) as primary priority
 * - For each batch, finds the best combination that gets closest to target
 * - Uses a scoring system that balances proximity to target and total income
 * - Post office accepts max 5000 pieces per batch, so batches are created accordingly
 * - For targets > 5000, creates multiple batches (e.g., 10000 = 2 batches of ~5000 each)
 * - Never exceeds the target piece count or 5000 pieces per batch
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
  // Post office accepts max 5000 pieces per batch
  // Calculate how many batches we need based on total target
  const numBatches = Math.ceil(targetPostcards / BATCH_SIZE)
  
  // Calculate target per batch
  // For multi-batch scenarios, each batch should target up to 5000 pieces
  // For single batch, target the exact amount (but still respect 5000 max)
  const getBatchTarget = (batchIndex, totalBatches, remainingNeeded) => {
    if (totalBatches === 1) {
      // Single batch: target the exact amount, but cap at 5000
      return Math.min(targetPostcards, BATCH_SIZE)
    } else {
      // Multi-batch: each batch targets up to 5000 pieces
      // Use remainingNeeded to ensure we don't exceed total target
      return Math.min(BATCH_SIZE, remainingNeeded)
    }
  }

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

    // Strategy 1: Greedy from highest income, stopping when we get close (never exceed)
    const tryGreedy = () => {
      const selected = []
      let totalPieces = 0
      let totalIncome = 0

      for (const route of candidateRoutes) {
        const pieces = getPieceCount(route)
        const newTotal = totalPieces + pieces
        
        // Never exceed the target - post office requirement
        if (newTotal > targetPieces) {
          break
        }
        
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

    // Strategy 2: Try to get exactly at or just under target (never exceed)
    const tryExactMatch = () => {
      const selected = []
      let totalPieces = 0
      let totalIncome = 0

      for (const route of candidateRoutes) {
        const pieces = getPieceCount(route)
        // Never exceed the target - post office requirement
        if (totalPieces + pieces <= targetPieces) {
          selected.push(route.id)
          totalPieces += pieces
          totalIncome += route.income ?? 0
        } else {
          // If adding this route would exceed target, check if we can swap it
          // with a lower-income route to get closer to target
          if (selected.length > 0) {
            // Try to find a lower-income route to replace
            let bestSwap = null
            let bestSwapScore = -Infinity
            
            for (let i = 0; i < selected.length; i++) {
              const existingRouteId = selected[i]
              const existingRoute = candidateRoutes.find(r => r.id === existingRouteId)
              if (existingRoute && existingRoute.income < route.income) {
                const existingPieces = getPieceCount(existingRoute)
                const newTotal = totalPieces - existingPieces + pieces
                if (newTotal <= targetPieces) {
                  const swapScore = route.income - existingRoute.income
                  if (swapScore > bestSwapScore) {
                    bestSwap = { index: i, existingRoute, newTotal }
                    bestSwapScore = swapScore
                  }
                }
              }
            }
            
            if (bestSwap) {
              // Perform the swap
              selected[bestSwap.index] = route.id
              totalPieces = bestSwap.newTotal
              totalIncome = totalIncome - bestSwap.existingRoute.income + route.income
            }
          }
          // Stop if we can't add more without exceeding target
          break
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

        // Try with this route (if it doesn't exceed target)
        if (currentPieces + pieces <= targetPieces) {
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
  let totalPiecesSelected = 0

  for (let batchIdx = 1; batchIdx <= numBatches; batchIdx++) {
    // Calculate remaining pieces needed to reach total target
    const remainingNeeded = targetPostcards - totalPiecesSelected
    
    // If we've already reached or exceeded the target, stop
    if (remainingNeeded <= 0) {
      break
    }
    
    // Calculate target for this batch (up to 5000, but not exceeding remaining needed)
    const batchTarget = getBatchTarget(batchIdx, numBatches, remainingNeeded)
    
    // Find best combination for this batch
    const result = findBestCombination(remainingRoutes, batchTarget)
    
    // Track total pieces selected
    totalPiecesSelected += result.totalPieces
    
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
    
    // If we've reached or exceeded the total target, stop creating more batches
    if (totalPiecesSelected >= targetPostcards) {
      break
    }
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
