import { setPreference, getPreference } from '../services/Database';

// Test the preference functions
export const testPreferenceFunctions = async () => {
  try {
    console.log('[TEST] Testing setPreference...');
    await setPreference('test_key', 'test_value');
    console.log('[TEST] setPreference success');
    
    console.log('[TEST] Testing getPreference...');
    const value = await getPreference('test_key');
    console.log('[TEST] getPreference result:', value);
    
    return true;
  } catch (error) {
    console.log('[TEST] Preference functions failed:', error);
    return false;
  }
};
