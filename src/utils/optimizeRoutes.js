/**
 * Optimizes route selection based on target postcard count
 * Matches the reference implementation algorithm:
 * - Groups routes by prefix (first 5 characters)
 * - Sorts by income, then by residential quantity
 * - Handles multi-batch optimization for targets >= 10,000
 */
export function optimizeRoutes(routes, targetPostcards, residentialOnly = false) {
  if (!routes || routes.length === 0) return []

  // Filter routes based on residential only option
  let availableRoutes = routes
  if (residentialOnly) {
    availableRoutes = routes.filter(route => route.residential > 0)
  }

  // Filter out routes with no addresses (like PBOX routes with dashes or $0 income)
  availableRoutes = availableRoutes.filter(route => route.total > 0 && route.income > 0)

  if (availableRoutes.length === 0) return []

  const BATCH_SIZE = 5000 // Qs in reference code

  // Group routes by prefix (first 5 characters), excluding PBOX routes
  const routeGroups = availableRoutes
    .filter(route => route.route && !route.route.includes("PBOX"))
    .reduce((groups, route) => {
      const prefix = route.route.slice(0, 5) || ''
      if (!groups[prefix]) {
        groups[prefix] = []
      }
      groups[prefix].push(route)
      return groups
    }, {})

  // Sort routes within each group by income (desc), then by residential quantity (desc)
  // If income difference < 1000, sort by residential quantity
  Object.keys(routeGroups).forEach(prefix => {
    routeGroups[prefix].sort((a, b) => {
      const incomeDiff = (b.income ?? 0) - (a.income ?? 0)
      if (Math.abs(incomeDiff) > 1000) {
        return incomeDiff
      }
      return (b.residential ?? 0) - (a.residential ?? 0)
    })
  })

  // Sort groups by income of first route in group (desc), then by residential quantity
  const sortedGroupKeys = Object.keys(routeGroups).sort((keyA, keyB) => {
    const firstRouteA = routeGroups[keyA][0]
    const firstRouteB = routeGroups[keyB][0]
    const incomeDiff = (firstRouteB.income ?? 0) - (firstRouteA.income ?? 0)
    if (Math.abs(incomeDiff) > 1000) {
      return incomeDiff
    }
    return (firstRouteB.residential ?? 0) - (firstRouteA.residential ?? 0)
  })

  // Flatten sorted groups into a single array
  const sortedRoutes = sortedGroupKeys.flatMap(key => routeGroups[key])

  // Determine number of batches needed
  const isMultiBatch = targetPostcards >= 10000
  const numBatches = targetPostcards >= 15000 ? 3 : targetPostcards >= 10000 ? 2 : 1

  // Track batch totals
  const batchTotals = Array(numBatches).fill(0)
  
  // Create a working copy of routes with selection state
  const workingRoutes = availableRoutes.map(route => ({
    ...route,
    selected: false,
    batchNumber: undefined
  }))

  if (sortedGroupKeys.length > 1 && isMultiBatch) {
    // Multi-batch logic: assign groups to batches
    let currentBatch = 1
    
    for (const groupKey of sortedGroupKeys) {
      if (currentBatch > numBatches) break
      
      const groupRoutes = routeGroups[groupKey]
      let groupTotal = 0
      
      // Add routes from this group to current batch
      for (const route of groupRoutes) {
        const quantity = residentialOnly ? (route.residential ?? 0) : (route.total ?? 0)
        
        if (batchTotals[currentBatch - 1] + quantity <= BATCH_SIZE) {
          const workingRoute = workingRoutes.find(r => r.id === route.id)
          if (workingRoute) {
            workingRoute.selected = true
            workingRoute.batchNumber = currentBatch
            batchTotals[currentBatch - 1] += quantity
            groupTotal += quantity
          }
        }
      }
      
      // Move to next batch if this group added significant routes (> 1000)
      if (groupTotal > 1000) {
        currentBatch++
      }
    }
    
    // Fill remaining space in batches
    for (let batchIdx = 1; batchIdx <= numBatches; batchIdx++) {
      if (batchTotals[batchIdx - 1] < BATCH_SIZE) {
        for (const route of sortedRoutes) {
          const workingRoute = workingRoutes.find(r => r.id === route.id)
          if (!workingRoute?.selected) {
            const quantity = residentialOnly ? (route.residential ?? 0) : (route.total ?? 0)
            
            if (batchTotals[batchIdx - 1] + quantity <= BATCH_SIZE) {
              workingRoute.selected = true
              workingRoute.batchNumber = batchIdx
              batchTotals[batchIdx - 1] += quantity
            }
          }
        }
      }
    }
  } else {
    // Single batch or target < 10,000
    const targetLimit = isMultiBatch ? BATCH_SIZE : targetPostcards
    
    // Fill first batch
    for (const route of sortedRoutes) {
      const quantity = residentialOnly ? (route.residential ?? 0) : (route.total ?? 0)
      
      if (batchTotals[0] + quantity <= targetLimit) {
        const workingRoute = workingRoutes.find(r => r.id === route.id)
        if (workingRoute) {
          workingRoute.selected = true
          workingRoute.batchNumber = 1
          batchTotals[0] += quantity
        }
      }
    }
    
    // If multi-batch, fill additional batches
    if (isMultiBatch) {
      for (let batchIdx = 2; batchIdx <= numBatches; batchIdx++) {
        for (const route of sortedRoutes) {
          const workingRoute = workingRoutes.find(r => r.id === route.id)
          if (!workingRoute?.selected) {
            const quantity = residentialOnly ? (route.residential ?? 0) : (route.total ?? 0)
            
            if (batchTotals[batchIdx - 1] + quantity <= BATCH_SIZE) {
              workingRoute.selected = true
              workingRoute.batchNumber = batchIdx
              batchTotals[batchIdx - 1] += quantity
            }
          }
        }
      }
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
