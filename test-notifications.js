/**
 * Simple notification test script
 * Run this to test basic notification functionality
 */

const { NotificationTroubleshoot } = require('./utils/notificationTroubleshoot');

async function runNotificationTest() {
  console.log('🚀 Starting notification test...\n');
  
  try {
    // Run the advanced diagnostic
    console.log('Running advanced diagnostic...');
    const results = await NotificationTroubleshoot.runAdvancedDiagnostic('test-user');
    
    console.log('\n📊 DIAGNOSTIC RESULTS:');
    console.log('='.repeat(50));
    
    // Overall status
    console.log(`Overall Status: ${results.success ? '✅ SUCCESS' : '❌ ISSUES FOUND'}`);
    
    // Device info
    console.log(`\n📱 Device Information:`);
    console.log(`  - Type: ${results.device.isDevice ? 'Physical Device' : 'Simulator'}`);
    console.log(`  - Platform: ${results.device.platform} ${results.device.osVersion}`);
    console.log(`  - Manufacturer: ${results.device.manufacturer || 'Unknown'}`);
    console.log(`  - Model: ${results.device.modelName || 'Unknown'}`);
    console.log(`  - Is Expo Go: ${results.device.isExpoGo}`);
    
    // Permissions
    console.log(`\n🔔 Notification Permissions:`);
    console.log(`  - Current Status: ${results.permissions.current?.status || 'unknown'}`);
    if (results.permissions.requested) {
      console.log(`  - Requested Status: ${results.permissions.requested.status}`);
    }
    console.log(`  - Final Status: ${results.permissions.final || 'unknown'}`);
    
    // Tokens
    console.log(`\n🎫 Push Tokens:`);
    if (results.tokens.expo) {
      console.log(`  - Expo Token: ${results.tokens.expo.success ? '✅' : '❌'}`);
      if (!results.tokens.expo.success) {
        console.log(`    Error: ${results.tokens.expo.error}`);
      }
    }
    if (results.tokens.device) {
      console.log(`  - Device Token: ${results.tokens.device.success ? '✅' : '❌'}`);
      if (!results.tokens.device.success) {
        console.log(`    Error: ${results.tokens.device.error}`);
      }
    }
    if (results.tokens.final) {
      console.log(`  - Final Token: ✅ ${results.tokens.finalPreview}`);
      console.log(`  - Stored: ${results.tokens.stored ? '✅' : '❌'}`);
    } else {
      console.log(`  - Final Token: ❌ No token available`);
    }
    
    // Android channels
    if (results.channels) {
      console.log(`\n📱 Notification Channels (Android):`);
      console.log(`  - Setup: ${results.channels.success ? '✅' : '❌'}`);
      if (results.channels.updated) {
        console.log(`  - Channels: ${results.channels.updated.length}`);
        results.channels.updated.forEach(channel => {
          console.log(`    • ${channel.name} (${channel.id}): ${channel.importance}`);
        });
      }
    }
    
    // Firestore
    console.log(`\n🔥 Firestore Integration:`);
    console.log(`  - Connection: ${results.firestore.success ? '✅' : '❌'}`);
    if (results.firestore.success) {
      console.log(`  - Token Matches: ${results.firestore.tokenMatches ? '✅' : '❌'}`);
      console.log(`  - Last Update: ${results.firestore.lastUpdate}`);
    } else if (results.firestore.error) {
      console.log(`  - Error: ${results.firestore.error}`);
    }
    
    // Connectivity
    console.log(`\n🌐 Network Connectivity:`);
    console.log(`  - Expo Push Service: ${results.connectivity.expoService ? '✅' : '❌'}`);
    if (results.connectivity.error) {
      console.log(`  - Error: ${results.connectivity.error}`);
    }
    
    // Test notification
    if (results.testNotification) {
      console.log(`\n🔔 Test Notification:`);
      console.log(`  - Sent: ${results.testNotification.success ? '✅' : '❌'}`);
      if (results.testNotification.success) {
        console.log(`  - Status: ${results.testNotification.status}`);
        console.log(`  - Has Errors: ${results.testNotification.hasErrors ? '⚠️' : '✅'}`);
      } else if (results.testNotification.error) {
        console.log(`  - Error: ${results.testNotification.error}`);
      }
    }
    
    // Local notification
    if (results.localNotification) {
      console.log(`\n📅 Local Notification:`);
      console.log(`  - Scheduled: ${results.localNotification.scheduled ? '✅' : '❌'}`);
      if (results.localNotification.error) {
        console.log(`  - Error: ${results.localNotification.error}`);
      }
    }
    
    // Issues and fixes
    if (results.issues.length > 0) {
      console.log(`\n⚠️ ISSUES FOUND (${results.issues.length}):`);
      results.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.replace(/_/g, ' ')}`);
      });
    }
    
    if (results.fixes.length > 0) {
      console.log(`\n🔧 SUGGESTED FIXES:`);
      results.fixes.forEach((fix, index) => {
        console.log(`  ${index + 1}. ${fix}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (results.success) {
      console.log('🎉 All tests passed! Notifications should be working.');
    } else {
      console.log('⚠️  Some issues were found. Please check the fixes above.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// For testing purposes - not needed in production
if (require.main === module) {
  runNotificationTest().then(() => {
    console.log('\n✅ Test completed');
  }).catch((error) => {
    console.error('\n❌ Test failed:', error);
  });
}

module.exports = { runNotificationTest };
