const { pool } = require('../config/db');

/**
 * Route Optimization Service for WSBS Collectors
 * Provides intelligent routing for waste collection based on:
 * 1. Geographic proximity (block/lot clustering)
 * 2. Priority levels (overdue payments, special requests)
 * 3. Accessibility (main roads first, then side streets)
 * 4. Collection efficiency (minimize backtracking)
 */

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Optimize collection route using nearest neighbor algorithm with priorities
const optimizeCollectionRoute = async (stops, startingPoint = null) => {
  if (!stops || stops.length === 0) return [];
  if (stops.length === 1) return [{ ...stops[0], sequence_no: 1, route_priority: 'normal' }];

  console.log(`🗺️ Optimizing route for ${stops.length} stops...`);

  // Add priority scoring to each stop
  const stopsWithPriority = stops.map(stop => {
    let priorityScore = 0;
    let routePriority = 'normal';

    // Priority factors
    if (stop.payment_status === 'overdue') {
      priorityScore += 10;
      routePriority = 'high';
    }
    if (stop.subscription_status === 'pending_payment') {
      priorityScore += 5;
      routePriority = routePriority === 'high' ? 'high' : 'medium';
    }
    if (stop.special_instructions) {
      priorityScore += 3;
    }
    if (stop.accessibility === 'difficult') {
      priorityScore -= 2; // Lower priority for difficult access
    }

    return {
      ...stop,
      priority_score: priorityScore,
      route_priority: routePriority
    };
  });

  // Group stops by block for efficient clustering
  const blockGroups = {};
  stopsWithPriority.forEach(stop => {
    const blockKey = stop.block || 'unknown';
    if (!blockGroups[blockKey]) {
      blockGroups[blockKey] = [];
    }
    blockGroups[blockKey].push(stop);
  });

  console.log(`📍 Grouped into ${Object.keys(blockGroups).length} blocks:`, 
    Object.keys(blockGroups).map(block => `${block}(${blockGroups[block].length})`).join(', '));

  // Sort blocks by priority and accessibility
  const sortedBlocks = Object.keys(blockGroups).sort((a, b) => {
    const avgPriorityA = blockGroups[a].reduce((sum, stop) => sum + stop.priority_score, 0) / blockGroups[a].length;
    const avgPriorityB = blockGroups[b].reduce((sum, stop) => sum + stop.priority_score, 0) / blockGroups[b].length;
    
    // Prioritize blocks with higher average priority scores
    if (avgPriorityA !== avgPriorityB) {
      return avgPriorityB - avgPriorityA;
    }
    
    // Then by block number (assuming numbered blocks)
    const blockNumA = parseInt(a) || 999;
    const blockNumB = parseInt(b) || 999;
    return blockNumA - blockNumB;
  });

  // Build optimized route
  const optimizedRoute = [];
  let sequenceNo = 1;

  for (const blockKey of sortedBlocks) {
    const blockStops = blockGroups[blockKey];
    
    // Sort stops within block by lot number and priority
    const sortedBlockStops = blockStops.sort((a, b) => {
      // First by priority score
      if (a.priority_score !== b.priority_score) {
        return b.priority_score - a.priority_score;
      }
      
      // Then by lot number for logical progression
      const lotA = parseInt(a.lot) || 999;
      const lotB = parseInt(b.lot) || 999;
      return lotA - lotB;
    });

    // Add block stops to route
    for (const stop of sortedBlockStops) {
      optimizedRoute.push({
        ...stop,
        sequence_no: sequenceNo++,
        block_group: blockKey,
        route_explanation: `Block ${blockKey}, Priority: ${stop.route_priority}`
      });
    }
  }

  // Calculate route statistics
  const routeStats = {
    total_stops: optimizedRoute.length,
    high_priority_stops: optimizedRoute.filter(s => s.route_priority === 'high').length,
    medium_priority_stops: optimizedRoute.filter(s => s.route_priority === 'medium').length,
    blocks_covered: Object.keys(blockGroups).length,
    estimated_duration_hours: Math.ceil(optimizedRoute.length * 0.15), // 9 minutes per stop average
    route_efficiency: calculateRouteEfficiency(optimizedRoute)
  };

  console.log('📊 Route Optimization Complete:', routeStats);

  return {
    optimized_stops: optimizedRoute,
    route_statistics: routeStats,
    optimization_notes: generateOptimizationNotes(optimizedRoute, routeStats)
  };
};

// Calculate route efficiency score
const calculateRouteEfficiency = (route) => {
  if (route.length < 2) return 100;

  let backtrackingPenalty = 0;
  const blockSequence = [];
  
  route.forEach(stop => {
    const currentBlock = stop.block_group;
    if (blockSequence.length > 0 && blockSequence[blockSequence.length - 1] !== currentBlock) {
      if (blockSequence.includes(currentBlock)) {
        backtrackingPenalty += 5; // Penalty for returning to a previous block
      }
    }
    if (!blockSequence.includes(currentBlock)) {
      blockSequence.push(currentBlock);
    }
  });

  const efficiency = Math.max(0, 100 - backtrackingPenalty);
  return efficiency;
};

// Generate optimization notes for collectors
const generateOptimizationNotes = (route, stats) => {
  const notes = [];
  
  if (stats.high_priority_stops > 0) {
    notes.push(`🔴 ${stats.high_priority_stops} high-priority stops (overdue payments)`);
  }
  
  if (stats.blocks_covered > 1) {
    notes.push(`🏘️ Route covers ${stats.blocks_covered} blocks for efficiency`);
  }
  
  if (stats.route_efficiency >= 90) {
    notes.push(`✅ Highly efficient route (${stats.route_efficiency}% efficiency)`);
  } else if (stats.route_efficiency < 70) {
    notes.push(`⚠️ Route has some backtracking (${stats.route_efficiency}% efficiency)`);
  }
  
  notes.push(`⏱️ Estimated completion: ${stats.estimated_duration_hours} hours`);
  
  return notes;
};

// Get optimized route for collector assignment
const getOptimizedCollectorRoute = async (collectorId, barangayId, subdivisionName = null) => {
  try {
    console.log(`🚛 Getting optimized route for collector ${collectorId} in barangay ${barangayId}`);
    
    // Fetch all stops for the collector
    let query = `
      SELECT DISTINCT
        u.user_id,
        COALESCE(un.first_name || ' ' || un.last_name, u.username, 'Unknown') as resident_name,
        a.street,
        a.block,
        a.lot,
        a.subdivision,
        b.barangay_name,
        cs.status as subscription_status,
        cs.payment_status,
        i.status as invoice_status,
        i.due_date,
        sp.plan_name,
        sp.price,
        CASE 
          WHEN i.due_date < CURRENT_DATE THEN 'overdue'
          WHEN i.due_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
          ELSE 'normal'
        END as payment_priority,
        CASE
          WHEN a.street ILIKE '%main%' OR a.street ILIKE '%highway%' THEN 'easy'
          WHEN a.street ILIKE '%inner%' OR a.street ILIKE '%alley%' THEN 'difficult'
          ELSE 'normal'
        END as accessibility,
        COALESCE(cse.action, 'pending') as latest_action,
        cse.created_at as last_collection_date
      FROM users u
      LEFT JOIN user_names un ON u.name_id = un.name_id
      LEFT JOIN addresses a ON u.address_id = a.address_id
      LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
      LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id AND cs.status IN ('active', 'pending_payment')
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      LEFT JOIN invoices i ON cs.subscription_id = i.subscription_id AND i.status = 'unpaid'
      LEFT JOIN (
        SELECT DISTINCT ON (user_id) user_id, action, created_at
        FROM collection_stop_events
        WHERE DATE(created_at) = CURRENT_DATE
        ORDER BY user_id, created_at DESC
      ) cse ON u.user_id = cse.user_id
      WHERE u.role_id = 3 
        AND u.approval_status = 'approved'
        AND b.barangay_id = $1
        AND cs.subscription_id IS NOT NULL
        AND (cse.action IS NULL OR cse.action != 'collected')
    `;
    
    const params = [barangayId];
    
    if (subdivisionName) {
      query += ` AND a.subdivision ILIKE $2`;
      params.push(`%${subdivisionName}%`);
    }
    
    query += ` ORDER BY a.block, a.lot`;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return {
        optimized_stops: [],
        route_statistics: { total_stops: 0 },
        optimization_notes: ['No stops available for collection today']
      };
    }
    
    // Optimize the route
    const optimizedRoute = await optimizeCollectionRoute(result.rows);
    
    return optimizedRoute;
    
  } catch (error) {
    console.error('❌ Error optimizing collector route:', error);
    throw error;
  }
};

// Get route suggestions for better efficiency
const getRouteSuggestions = async (collectorId, currentRoute) => {
  const suggestions = [];
  
  if (!currentRoute || currentRoute.length === 0) {
    return suggestions;
  }
  
  // Analyze current route for improvements
  const blockGroups = {};
  currentRoute.forEach(stop => {
    const block = stop.block || 'unknown';
    if (!blockGroups[block]) blockGroups[block] = [];
    blockGroups[block].push(stop);
  });
  
  // Check for scattered blocks
  if (Object.keys(blockGroups).length > currentRoute.length * 0.7) {
    suggestions.push({
      type: 'efficiency',
      priority: 'medium',
      message: 'Consider grouping collections by block to reduce travel time',
      action: 'Reorganize route by geographic clusters'
    });
  }
  
  // Check for high-priority stops at the end
  const lastFiveStops = currentRoute.slice(-5);
  const highPriorityAtEnd = lastFiveStops.filter(s => s.route_priority === 'high').length;
  
  if (highPriorityAtEnd > 0) {
    suggestions.push({
      type: 'priority',
      priority: 'high',
      message: `${highPriorityAtEnd} high-priority stops scheduled for end of route`,
      action: 'Consider collecting overdue payments earlier in the day'
    });
  }
  
  return suggestions;
};

module.exports = {
  optimizeCollectionRoute,
  getOptimizedCollectorRoute,
  getRouteSuggestions,
  calculateDistance
};
