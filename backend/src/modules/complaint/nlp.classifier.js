const VALID_CATEGORIES = new Set([
  'Electrical',
  'Plumbing',
  'IT',
  'Cleaning',
  'Maintenance',
  'Administration',
  'Other',
])

const CATEGORY_ALIASES = {
  Electricity: 'Electrical',
  Electrical: 'Electrical',
  Electric: 'Electrical',
  Water: 'Plumbing',
  Plumbing: 'Plumbing',
  Network: 'IT',
  IT: 'IT',
  Technology: 'IT',
  Computer: 'IT',
  Sanitation: 'Cleaning',
  Cleaning: 'Cleaning',
  Furniture: 'Maintenance',
  Maintenance: 'Maintenance',
  Admin: 'Administration',
  Administration: 'Administration',
  Other: 'Other',
}

const PRIORITY_ALIASES = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW',
}

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const keywordPattern = keyword =>
  new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword).replace(/\s+/g, '\\s+')}([^a-z0-9]|$)`, 'i')

const compileKeywords = keywords => keywords.map(keywordPattern)

const matchesAny = (text, patterns) => patterns.some(pattern => pattern.test(text))

const CATEGORY_RULES = [
  {
    category: 'Electrical',
    patterns: compileKeywords([
      'fire',
      'smoke',
      'burning',
      'electricity',
      'electrical',
      'power',
      'power cut',
      'power outage',
      'no electricity',
      'short circuit',
      'spark',
      'sparking',
      'shock',
      'electric shock',
      'electrocution',
      'exposed wire',
      'wire',
      'wiring',
      'switch',
      'switchboard',
      'socket',
      'outlet',
      'breaker',
      'mcb',
      'inverter',
      'generator',
      'voltage',
      'voltage fluctuation',
      'light',
      'tube light',
      'tubelight',
      'bulb',
      'led',
      'fan',
      'ceiling fan',
      'regulator',
      'ac',
      'air conditioner',
      'cooling',
      'geyser',
      'immersion rod',
      'plug point',
      'extension box',
      'fuse',
      'flickering',
      'blackout',
    ]),
  },
  {
    category: 'Plumbing',
    patterns: compileKeywords([
      'water',
      'no water',
      'water not coming',
      'drinking water',
      'water cooler',
      'purifier',
      'ro water',
      'ro purifier',
      'tap',
      'pipe',
      'pipeline',
      'leak',
      'leaking',
      'leakage',
      'burst pipe',
      'burst',
      'flood',
      'flooding',
      'overflow',
      'drain',
      'drainage',
      'choke',
      'choked',
      'clog',
      'clogged',
      'flush',
      'flush tank',
      'commode',
      'urinal',
      'sewer',
      'sewage',
      'faucet',
      'health faucet',
      'shower',
      'overhead tank',
      'washbasin',
      'wash basin',
    ]),
  },
  {
    category: 'IT',
    patterns: compileKeywords([
      'wifi',
      'wi-fi',
      'internet',
      'network',
      'server',
      'login',
      'portal',
      'student portal',
      'website',
      'app',
      'software',
      'computer',
      'pc',
      'lab pc',
      'printer',
      'projector',
      'hdmi',
      'rfid',
      'biometric',
      'attendance machine',
      'system error',
      'password',
      'lan',
      'ethernet',
      'blue screen',
      'keyboard',
      'mouse',
      'monitor',
      'display',
      'scanner',
      'mac address',
      'captive portal',
      'net',
    ]),
  },
  {
    category: 'Cleaning',
    patterns: compileKeywords([
      'cleaning',
      'clean',
      'dirty',
      'garbage',
      'trash',
      'waste',
      'dustbin',
      'smell',
      'stink',
      'stinking',
      'odor',
      'odour',
      'hygiene',
      'sanitation',
      'sanitary',
      'pad',
      'napkin',
      'mosquito',
      'pest',
      'rat',
      'cockroach',
      'graffiti',
      'sweep',
      'sweeping',
      'mop',
      'mopping',
      'spill',
      'spilled',
      'algae',
      'fungus',
      'mold',
      'scrub',
      'scrubbing',
      'dust',
      'unhygienic',
      'cobweb',
    ]),
  },
  {
    category: 'Maintenance',
    patterns: compileKeywords([
      'broken',
      'repair',
      'damaged',
      'furniture',
      'chair',
      'bench',
      'desk',
      'table',
      'door',
      'window',
      'lock',
      'latch',
      'handle',
      'hinge',
      'key',
      'ceiling',
      'roof',
      'wall',
      'floor',
      'tile',
      'lift',
      'elevator',
      'staircase',
      'stairs',
      'handrail',
      'railing',
      'step',
      'cracked',
      'plaster',
      'seepage',
      'dampness',
      'peeling',
      'whiteboard',
      'blackboard',
      'podium',
      'locker',
      'infrastructure',
      'gate',
      'cupboard',
      'almirah',
    ]),
  },
  {
    category: 'Administration',
    patterns: compileKeywords([
      'fee',
      'fees',
      'fee receipt',
      'receipt',
      'scholarship',
      'certificate',
      'bonafide',
      'exam',
      'examination',
      'timetable',
      'schedule',
      'attendance',
      'hall ticket',
      'admit card',
      'id card',
      'identity card',
      'bus pass',
      'transport bus',
      'food quality',
      'mess food',
      'canteen food',
      'document verification',
      'admission',
      'library card',
      'library fine',
      'book return',
      'fine',
      'warden',
      'hostel fee',
    ]),
  },
]

const SAFETY_CRITICAL_CATEGORY_PATTERNS = {
  Electrical: compileKeywords([
    'fire',
    'smoke',
    'short circuit',
    'electric shock',
    'electrocution',
    'exposed wire',
  ]),
  Plumbing: compileKeywords(['burst pipe', 'sewage leak', 'gas leak']),
}

const HIGH_PRIORITY_PATTERNS = [
  ...compileKeywords([
    'fire',
    'smoke',
    'burning',
    'short circuit',
    'electric shock',
    'electrocution',
    'exposed wire',
    'gas leak',
    'flood',
    'flooding',
    'burst',
    'burst pipe',
    'overflow',
    'sewage leak',
    'collapse',
    'collapsed',
    'injury',
    'injured',
    'accident',
    'emergency',
    'urgent',
    'danger',
    'dangerous',
    'hazard',
    'hazardous',
    'contaminated',
    'food poisoning',
  ]),
  /\b(no water|water not coming|no electricity|power outage|internet down|network down)\b.*\b(entire|whole|all|hostel|building|block|campus|exam|lab|server|urgent|emergency)\b/i,
  /\b(entire|whole|all|hostel|building|block|campus|exam|lab|server|urgent|emergency)\b.*\b(no water|water not coming|no electricity|power outage|internet down|network down)\b/i,
]

const LOW_PRIORITY_PATTERNS = compileKeywords([
  'suggestion',
  'suggest',
  'request',
  'recommend',
  'improvement',
  'minor',
  'small',
  'convenience',
  'would be nice',
  'if possible',
])

const clampConfidence = value => {
  const confidence = Number(value)

  if (!Number.isFinite(confidence)) {
    return 0
  }

  return Math.max(0, Math.min(1, confidence))
}

export const normalizeNlpCategory = category => {
  const normalized = CATEGORY_ALIASES[String(category ?? '').trim()]

  if (normalized && VALID_CATEGORIES.has(normalized)) {
    return normalized
  }

  return 'Other'
}

export const normalizeNlpPriority = priority =>
  PRIORITY_ALIASES[String(priority ?? '').trim().toLowerCase()] ?? 'MEDIUM'

export const classifyComplaintText = text => {
  const complaintText = String(text ?? '').trim()

  if (!complaintText) {
    return {
      category: 'Other',
      priority: 'MEDIUM',
      confidence: 0,
      source: 'rules',
    }
  }

  // Check safety critical override first
  let safetyCategory = null
  for (const [cat, patterns] of Object.entries(SAFETY_CRITICAL_CATEGORY_PATTERNS)) {
    if (matchesAny(complaintText, patterns)) {
      safetyCategory = cat
      break
    }
  }

  let matchedCategory = safetyCategory
  let bestScore = 0

  if (!matchedCategory) {
    for (const rule of CATEGORY_RULES) {
      const matchCount = rule.patterns.filter(pattern => pattern.test(complaintText)).length
      if (matchCount > bestScore) {
        bestScore = matchCount
        matchedCategory = rule.category
      }
    }
  }

  const hasHighSignal = matchesAny(complaintText, HIGH_PRIORITY_PATTERNS)
  const hasLowSignal = matchesAny(complaintText, LOW_PRIORITY_PATTERNS)

  return {
    category: matchedCategory ?? 'Other',
    priority: hasHighSignal ? 'HIGH' : hasLowSignal ? 'LOW' : 'MEDIUM',
    confidence: safetyCategory ? 0.98 : matchedCategory ? 0.95 : hasHighSignal || hasLowSignal ? 0.8 : 0.5,
    source: 'rules',
  }
}

export const applyClassificationOverrides = (text, rawResult = {}) => {
  const ruleResult = classifyComplaintText(text)
  const rawCategory = normalizeNlpCategory(rawResult.category)
  const rawPriority = normalizeNlpPriority(rawResult.priority)
  const rawConfidence = clampConfidence(rawResult.category_confidence ?? rawResult.confidence)

  const isSafetyCritical =
    matchesAny(text, SAFETY_CRITICAL_CATEGORY_PATTERNS.Electrical) ||
    matchesAny(text, SAFETY_CRITICAL_CATEGORY_PATTERNS.Plumbing)

  const shouldUseRuleCategory =
    ruleResult.category !== 'Other' &&
    (isSafetyCritical ||
      rawCategory === 'Other' ||
      rawConfidence < 0.65 ||
      (rawConfidence < 0.85 && rawCategory === 'Other'))

  const category = shouldUseRuleCategory ? ruleResult.category : rawCategory
  const priority = ruleResult.priority !== 'MEDIUM' ? ruleResult.priority : rawPriority
  const confidence = shouldUseRuleCategory
    ? ruleResult.confidence
    : rawConfidence || ruleResult.confidence

  return {
    category,
    priority,
    confidence: Number(confidence.toFixed(2)),
    source: shouldUseRuleCategory ? 'rules' : 'nlp',
  }
}
