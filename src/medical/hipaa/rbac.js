/**
 * HIPAA Role-Based Access Control (RBAC)
 * Defines permissions for different user roles
 */

/**
 * User roles in the medical system
 */
export const Role = {
  PROVIDER: 'provider',           // Doctors, NPs - full clinical access
  CLINICAL_STAFF: 'clinical',     // MAs, nurses - limited clinical access
  FRONT_DESK: 'front_desk',       // Scheduling only, no clinical data
  BILLING: 'billing',             // Financial data only
  AI_AGENT: 'ai_agent',           // Limited read for scheduling/engagement
  ADMIN: 'admin'                  // Full access + audit capability
};

/**
 * Resource types in the system
 */
export const ResourceType = {
  PATIENT: 'patient',
  APPOINTMENT: 'appointment',
  MEDICAL_RECORD: 'medical_record',
  PRESCRIPTION: 'prescription',
  INSURANCE: 'insurance',
  PROVIDER: 'provider',
  FINANCIAL: 'financial',
  AUDIT_LOG: 'audit_log'
};

/**
 * Actions that can be performed
 */
export const Action = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export'
};

/**
 * Permission structure
 * @typedef {Object} Permission
 * @property {Role} role - User role
 * @property {string} resource - Resource pattern (e.g., 'patient.*' or 'patient.demographics')
 * @property {Action[]} actions - Allowed actions
 * @property {string[]} fields - Allowed fields (if resource is field-specific)
 */

/**
 * Permission matrix
 */
const PERMISSIONS = [
  // Providers: Full clinical access
  {
    role: Role.PROVIDER,
    resource: 'patient.*',
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    fields: ['*'] // All fields
  },
  {
    role: Role.PROVIDER,
    resource: 'appointment.*',
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    fields: ['*']
  },
  {
    role: Role.PROVIDER,
    resource: 'medical_record.*',
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    fields: ['*']
  },

  // Clinical staff: Read clinical, update limited
  {
    role: Role.CLINICAL_STAFF,
    resource: 'patient.demographics',
    actions: [Action.READ, Action.UPDATE],
    fields: ['name', 'phone', 'email', 'address', 'emergency_contact']
  },
  {
    role: Role.CLINICAL_STAFF,
    resource: 'patient.clinical',
    actions: [Action.READ],
    fields: ['allergies', 'medications', 'diagnosis']
  },
  {
    role: Role.CLINICAL_STAFF,
    resource: 'appointment.*',
    actions: [Action.CREATE, Action.READ, Action.UPDATE],
    fields: ['*']
  },

  // Front desk: Scheduling only, no clinical data
  {
    role: Role.FRONT_DESK,
    resource: 'appointment.*',
    actions: [Action.CREATE, Action.READ, Action.UPDATE],
    fields: ['*']
  },
  {
    role: Role.FRONT_DESK,
    resource: 'patient.demographics',
    actions: [Action.READ, Action.UPDATE],
    fields: ['name', 'phone', 'email', 'address', 'insurance_provider']
  },
  {
    role: Role.FRONT_DESK,
    resource: 'patient.clinical',
    actions: [], // No clinical access
    fields: []
  },

  // Billing: Financial data only
  {
    role: Role.BILLING,
    resource: 'patient.demographics',
    actions: [Action.READ],
    fields: ['name', 'insurance_provider', 'insurance_member_id']
  },
  {
    role: Role.BILLING,
    resource: 'financial.*',
    actions: [Action.CREATE, Action.READ, Action.UPDATE],
    fields: ['*']
  },
  {
    role: Role.BILLING,
    resource: 'insurance.*',
    actions: [Action.READ, Action.UPDATE],
    fields: ['*']
  },

  // AI agents: Read-only for engagement (no clinical data)
  {
    role: Role.AI_AGENT,
    resource: 'patient.demographics',
    actions: [Action.READ],
    fields: ['name', 'phone', 'email'] // Minimal for engagement
  },
  {
    role: Role.AI_AGENT,
    resource: 'appointment.*',
    actions: [Action.CREATE, Action.READ, Action.UPDATE],
    fields: ['appointment_date', 'appointment_time', 'provider', 'status']
  },
  {
    role: Role.AI_AGENT,
    resource: 'engagement.*',
    actions: [Action.CREATE, Action.READ],
    fields: ['*']
  },
  {
    role: Role.AI_AGENT,
    resource: 'patient.clinical',
    actions: [], // No clinical access
    fields: []
  },

  // Admin: Full access + audit capability
  {
    role: Role.ADMIN,
    resource: '*',
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.EXPORT],
    fields: ['*']
  },
  {
    role: Role.ADMIN,
    resource: 'audit_log.*',
    actions: [Action.READ, Action.EXPORT],
    fields: ['*']
  }
];

/**
 * Check if a role has permission for a resource and action
 * @param {Role} role - User role
 * @param {string} resource - Resource (e.g., 'patient.demographics')
 * @param {Action} action - Action to perform
 * @param {string} field - Specific field (optional)
 * @returns {boolean} True if permission granted
 */
export function checkPermission(role, resource, action, field = null) {
  // Admin always has access
  if (role === Role.ADMIN) {
    return true;
  }

  // Find matching permissions
  const matchingPermissions = PERMISSIONS.filter(p => {
    // Check role match
    if (p.role !== role) {
      return false;
    }

    // Check resource pattern match
    const resourceMatch = matchResourcePattern(p.resource, resource);
    if (!resourceMatch) {
      return false;
    }

    // Check action
    if (!p.actions.includes(action)) {
      return false;
    }

    // Check field access (if field specified)
    if (field && p.fields && !p.fields.includes('*')) {
      if (!p.fields.includes(field)) {
        return false;
      }
    }

    return true;
  });

  return matchingPermissions.length > 0;
}

/**
 * Match resource pattern (supports wildcards)
 * @param {string} pattern - Pattern (e.g., 'patient.*' or 'patient.demographics')
 * @param {string} resource - Actual resource (e.g., 'patient.demographics')
 * @returns {boolean} True if matches
 */
function matchResourcePattern(pattern, resource) {
  // Exact match
  if (pattern === resource) {
    return true;
  }

  // Wildcard match (e.g., 'patient.*' matches 'patient.demographics')
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    if (resource.startsWith(prefix + '.')) {
      return true;
    }
  }

  // Full wildcard
  if (pattern === '*') {
    return true;
  }

  return false;
}

/**
 * Get allowed fields for a role and resource
 * @param {Role} role - User role
 * @param {string} resource - Resource
 * @returns {string[]} Allowed fields
 */
export function getAllowedFields(role, resource) {
  if (role === Role.ADMIN) {
    return ['*']; // All fields
  }

  const permissions = PERMISSIONS.filter(p => 
    p.role === role && matchResourcePattern(p.resource, resource)
  );

  // Merge all allowed fields
  const fields = new Set();
  for (const perm of permissions) {
    if (perm.fields && perm.fields.includes('*')) {
      return ['*']; // All fields allowed
    }
    for (const field of perm.fields || []) {
      fields.add(field);
    }
  }

  return Array.from(fields);
}

/**
 * Filter data based on role permissions
 * @param {Role} role - User role
 * @param {string} resource - Resource type
 * @param {Object} data - Data to filter
 * @returns {Object} Filtered data with only allowed fields
 */
export function filterDataByRole(role, resource, data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Admin sees everything
  if (role === Role.ADMIN) {
    return data;
  }

  const allowedFields = getAllowedFields(role, resource);

  // All fields allowed
  if (allowedFields.includes('*')) {
    return data;
  }

  // Filter to only allowed fields
  const filtered = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      filtered[field] = data[field];
    }
  }

  return filtered;
}

/**
 * Express middleware for RBAC
 */
export function rbacMiddleware(requiredRole, resource, action) {
  return (req, res, next) => {
    const userRole = req.user?.role || req.headers['x-user-role'] || Role.FRONT_DESK;
    
    if (!checkPermission(userRole, resource, action)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role ${userRole} does not have ${action} permission for ${resource}`
      });
    }

    next();
  };
}












