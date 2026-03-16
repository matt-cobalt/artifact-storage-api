import { createClient } from '@supabase/supabase-js';
import { encryptPHI } from './encryption.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * HIPAA Audit Logging Module
 * Logs all PHI access for compliance (7-year retention requirement)
 */

/**
 * Audit log entry structure
 * @typedef {Object} AuditLogEntry
 * @property {Date} timestamp - When the access occurred
 * @property {string} user_id - Who accessed the data
 * @property {string} user_role - Role of the user
 * @property {string} action - CREATE, READ, UPDATE, DELETE, EXPORT
 * @property {string} resource_type - Patient, Appointment, Medical_Record, etc.
 * @property {string} resource_id - ID of the resource accessed
 * @property {string[]} phi_accessed - Which PHI fields were accessed
 * @property {string} ip_address - Source IP address
 * @property {string} user_agent - User agent string
 * @property {string} justification - Why accessing (treatment, payment, operations)
 * @property {string} clinic_id - Which clinic this belongs to
 * @property {Object} metadata - Additional context
 */

/**
 * Log an audit entry for PHI access
 * @param {AuditLogEntry} entry - Audit log entry
 */
export async function logAudit(entry) {
  try {
    // Validate required fields
    if (!entry.user_id || !entry.action || !entry.resource_type) {
      throw new Error('Missing required audit log fields: user_id, action, resource_type');
    }

    // Encrypt PHI details for storage
    const encryptedDetails = encryptPHI(JSON.stringify({
      phi_accessed: entry.phi_accessed || [],
      metadata: entry.metadata || {},
      justification: entry.justification || 'Not provided'
    }));

    // Insert into medical_audit_logs table
    const { data, error } = await supabase
      .from('medical_audit_logs')
      .insert({
        timestamp: entry.timestamp || new Date().toISOString(),
        user_id: entry.user_id,
        user_role: entry.user_role || 'unknown',
        action: entry.action.toUpperCase(),
        resource_type: entry.resource_type,
        resource_id: entry.resource_id || null,
        phi_accessed_count: entry.phi_accessed ? entry.phi_accessed.length : 0,
        phi_fields: entry.phi_accessed || [], // Store field names (not values) for searching
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        justification: entry.justification || null,
        clinic_id: entry.clinic_id || null,
        encrypted_details: encryptedDetails,
        retention_until: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString() // 7 years
      })
      .select()
      .single();

    if (error) {
      console.error('Audit log insertion error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw - audit logging failure shouldn't break the application
    // but should be monitored
    return null;
  }
}

/**
 * Check if data contains PHI fields
 * @param {Object} data - Data to check
 * @param {string[]} phiFields - List of PHI field names
 * @returns {string[]} List of PHI fields found in data
 */
export function extractPHIFields(data, phiFields = [
  'name', 'ssn', 'dob', 'address', 'phone', 'email',
  'medical_record_number', 'diagnosis', 'medications', 'allergies'
]) {
  if (!data || typeof data !== 'object') {
    return [];
  }

  const found = [];
  for (const field of phiFields) {
    if (data[field] !== undefined && data[field] !== null) {
      found.push(field);
    }
  }

  return found;
}

/**
 * Extract resource type from request path
 * @param {string} path - Request path (e.g., /api/patients/123)
 * @returns {string} Resource type (e.g., 'Patient')
 */
export function extractResourceType(path) {
  const parts = path.split('/').filter(p => p);
  
  // Map common paths to resource types
  const mapping = {
    'patients': 'Patient',
    'appointments': 'Appointment',
    'medical_records': 'Medical_Record',
    'prescriptions': 'Prescription',
    'insurance': 'Insurance',
    'providers': 'Provider'
  };

  for (const part of parts) {
    if (mapping[part]) {
      return mapping[part];
    }
  }

  return 'Unknown';
}

/**
 * Extract resource ID from request path
 * @param {string} path - Request path (e.g., /api/patients/123)
 * @returns {string} Resource ID (e.g., '123')
 */
export function extractResourceId(path) {
  const parts = path.split('/').filter(p => p);
  // Usually the last part is the ID (UUID or numeric)
  return parts[parts.length - 1] || null;
}

/**
 * Express middleware for audit logging
 * Automatically logs PHI access
 */
export function auditMiddleware(req, res, next) {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to intercept responses
  res.json = function(data) {
    // Extract PHI fields from response
    const phiFields = extractPHIFields(data);
    
    if (phiFields.length > 0) {
      // Log audit entry asynchronously (don't block response)
      logAudit({
        timestamp: new Date(),
        user_id: req.user?.id || req.headers['x-user-id'] || 'system',
        user_role: req.user?.role || req.headers['x-user-role'] || 'unknown',
        action: mapHttpMethodToAction(req.method),
        resource_type: extractResourceType(req.path),
        resource_id: extractResourceId(req.path),
        phi_accessed: phiFields,
        ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'] || null,
        justification: req.headers['x-access-purpose'] || 'Not provided',
        clinic_id: req.user?.clinic_id || req.headers['x-clinic-id'] || null,
        metadata: {
          method: req.method,
          path: req.path,
          query: req.query
        }
      }).catch(err => {
        console.error('Async audit logging failed:', err);
        // Don't throw - logging failure shouldn't break response
      });
    }

    // Call original json method
    return originalJson(data);
  };

  next();
}

/**
 * Map HTTP method to audit action
 * @param {string} method - HTTP method
 * @returns {string} Audit action
 */
function mapHttpMethodToAction(method) {
  const mapping = {
    'GET': 'READ',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };

  return mapping[method.toUpperCase()] || 'READ';
}

/**
 * Query audit logs
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Audit log entries
 */
export async function queryAuditLogs(filters = {}) {
  let query = supabase
    .from('medical_audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(filters.limit || 100);

  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters.clinic_id) {
    query = query.eq('clinic_id', filters.clinic_id);
  }

  if (filters.resource_type) {
    query = query.eq('resource_type', filters.resource_type);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.start_date) {
    query = query.gte('timestamp', filters.start_date);
  }

  if (filters.end_date) {
    query = query.lte('timestamp', filters.end_date);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}












