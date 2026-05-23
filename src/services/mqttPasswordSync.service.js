import axios from 'axios';

const MQTT_SYNC_API_URL = process.env.MQTT_SYNC_API_URL || 'http://192.168.1.88:3001';
const MQTT_SYNC_API_TOKEN = process.env.MQTT_SYNC_API_TOKEN || 'sk-pdnpf';
const SYNC_TIMEOUT = 10000; // 10 seconds

/**
 * Get auth headers for MQTT Sync API
 */
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MQTT_SYNC_API_TOKEN}`
  };
}

/**
 * Sync password to MQTT broker
 * @param {string} username - MQTT username
 * @param {string} password - MQTT password (plaintext)
 * @returns {Promise<boolean>} - true if success, false if failed
 */
export async function syncPassword(username, password) {
  try {
    const response = await axios.post(
      `${MQTT_SYNC_API_URL}/credentials`,
      { username, password },
      {
        headers: getAuthHeaders(),
        timeout: SYNC_TIMEOUT
      }
    );

    if (response.data.success) {
      console.log(`MQTT sync succeeded for ${username}`);
      return true;
    } else {
      console.error(`MQTT sync failed for ${username}: unexpected response`);
      return false;
    }
  } catch (error) {
    console.error(`MQTT sync failed for ${username}:`, error.message);
    return false;
  }
}

/**
 * Delete credential from MQTT broker
 * @param {string} username - MQTT username
 * @returns {Promise<boolean>} - true if success, false if failed
 */
export async function deleteCredential(username) {
  try {
    const response = await axios.delete(
      `${MQTT_SYNC_API_URL}/credentials/${username}`,
      {
        headers: getAuthHeaders(),
        timeout: SYNC_TIMEOUT
      }
    );

    if (response.data.success) {
      console.log(`MQTT delete succeeded for ${username}`);
      return true;
    } else {
      console.error(`MQTT delete failed for ${username}: unexpected response`);
      return false;
    }
  } catch (error) {
    console.error(`MQTT delete failed for ${username}:`, error.message);
    return false;
  }
}

/**
 * Verify credential works on MQTT broker
 * @param {string} username - MQTT username
 * @param {string} password - MQTT password
 * @returns {Promise<boolean>} - true if valid, false if invalid
 */
export async function verifyCredential(username, password) {
  try {
    const response = await axios.post(
      `${MQTT_SYNC_API_URL}/verify`,
      { username, password },
      {
        headers: getAuthHeaders(),
        timeout: SYNC_TIMEOUT
      }
    );

    return response.data.valid === true;
  } catch (error) {
    console.error(`MQTT verify failed for ${username}:`, error.message);
    return false;
  }
}