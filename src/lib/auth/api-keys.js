/**
 * API Key Authentication System
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Generate API key
 * @param {string} shopId - Shop ID
 * @param {string} name - Key name
 * @param {Array<string>} permissions - Permissions array
 * @returns {Promise<string>} Plaintext API key (only returned once)
 */
export async function generateAPIKey(shopId, name, permissions = []) {
  try {
    // Generate random key
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const apiKey = `ai_live_${randomBytes}`;
    const keyPrefix = apiKey.substring(0, 8); // First 8 chars for identification

    // Hash the key
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Store in database
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        shop_id: shopId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: name,
        permissions: permissions,
        expires_at: null // Never expires by default
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to generate API key: ${error.message}`);
    }

    // Return plaintext key (only time it's returned)
    return apiKey;
  } catch (error) {
    console.error('generateAPIKey error:', error);
    throw error;
  }
}

/**
 * Validate API key
 * @param {string} apiKey - Plaintext API key
 * @returns {Promise<Object|null>} { shopId, permissions } or null if invalid
 */
export async function validateAPIKey(apiKey) {
  try {
    // Get all non-revoked keys
    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('revoked', false)
      .is('expires_at', null)
      .or(`expires_at.gt.${new Date().toISOString()}`);

    if (error) {
      throw new Error(`Failed to validate API key: ${error.message}`);
    }

    // Check each key hash
    for (const key of keys || []) {
      const isValid = await bcrypt.compare(apiKey, key.key_hash);
      if (isValid) {
        // Update last_used_at
        await supabase
          .from('api_keys')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', key.id);

        return {
          shopId: key.shop_id,
          permissions: key.permissions || [],
          keyId: key.id
        };
      }
    }

    return null;
  } catch (error) {
    console.error('validateAPIKey error:', error);
    return null;
  }
}

/**
 * Revoke API key
 * @param {string} keyId - Key ID
 * @returns {Promise<boolean>} Success
 */
export async function revokeAPIKey(keyId) {
  try {
    const { error } = await supabase
      .from('api_keys')
      .update({ revoked: true })
      .eq('id', keyId);

    if (error) {
      throw new Error(`Failed to revoke API key: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('revokeAPIKey error:', error);
    return false;
  }
}

/**
 * API key authentication middleware
 */
export async function authenticateAPIKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required. Provide via X-API-Key header.'
      });
    }

    const validation = await validateAPIKey(apiKey);

    if (!validation) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired API key'
      });
    }

    // Attach shop ID to request
    req.shopId = validation.shopId;
    req.apiKeyPermissions = validation.permissions;
    req.apiKeyId = validation.keyId;

    next();
  } catch (error) {
    console.error('authenticateAPIKey error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

export default {
  generateAPIKey,
  validateAPIKey,
  revokeAPIKey,
  authenticateAPIKey
};



















