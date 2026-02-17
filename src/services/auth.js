/**
 * API Key Authentication System
 * Simple token-based auth for API access
 */

const crypto = require('crypto');
const { supabase } = require('../db');

class AuthService {
  /**
   * Generate a new API key
   */
  static generateApiKey() {
    const key = crypto.randomBytes(32).toString('hex');
    const prefix = '2nd_';
    return prefix + key;
  }
  
  /**
   * Hash API key for storage (compare only)
   */
  static hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
  
  /**
   * Create new API key for user
   */
  static async createApiKey(userId, name = 'Default') {
    const key = this.generateApiKey();
    const hashedKey = this.hashApiKey(key);
    
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        key_hash: hashedKey,
        last_four: key.slice(-4), // Store last 4 for display
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: null // No expiration by default
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Return the full key (only time it's visible)
    return {
      id: data.id,
      key, // Full key - show to user once
      name: data.name,
      created_at: data.created_at
    };
  }
  
  /**
   * Validate API key from request
   */
  static async validateApiKey(key) {
    if (!key || !key.startsWith('2nd_')) {
      return { valid: false, error: 'Invalid key format' };
    }
    
    const hashedKey = this.hashApiKey(key);
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('*, users(*)')
      .eq('key_hash', hashedKey)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return { valid: false, error: 'Invalid or revoked API key' };
    }
    
    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, error: 'API key expired' };
    }
    
    // Update last used
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);
    
    return {
      valid: true,
      userId: data.user_id,
      keyId: data.id,
      user: data.users
    };
  }
  
  /**
   * Revoke API key
   */
  static async revokeApiKey(keyId, userId) {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('user_id', userId); // Ensure user owns this key
    
    if (error) throw error;
    return { success: true };
  }
  
  /**
   * List user's API keys
   */
  static async listApiKeys(userId) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, last_four, is_active, created_at, last_used_at, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Get usage stats for API key
   */
  static async getKeyUsage(keyId, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const { data, error } = await supabase
      .from('api_usage')
      .select('*')
      .eq('key_id', keyId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return {
      total_requests: data.length,
      endpoints: data.reduce((acc, row) => {
        acc[row.endpoint] = (acc[row.endpoint] || 0) + 1;
        return acc;
      }, {}),
      recent: data.slice(0, 10)
    };
  }
}

module.exports = AuthService;
