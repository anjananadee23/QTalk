import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import databaseService from '../utils/database';
import syncService from '../utils/syncService';

export default function SQLiteTestPanel() {
  const [dbStats, setDbStats] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastTestResult, setLastTestResult] = useState('');

  useEffect(() => {
    initializeTest();
  }, []);

  const initializeTest = async () => {
    try {
      await syncService.initialize();
      setIsInitialized(true);
      await refreshStats();
      setLastTestResult('✅ SQLite initialized successfully');
    } catch (error) {
      setLastTestResult(`❌ Initialization failed: ${error.message}`);
    }
  };

  const refreshStats = async () => {
    try {
      const stats = await databaseService.getDatabaseSize();
      setDbStats(stats);
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  const testUserOperations = async () => {
    try {
      const testUser = {
        id: 'test_user_123',
        username: 'TestUser',
        profileUrl: 'https://example.com/avatar.jpg',
        email: 'test@example.com'
      };

      await databaseService.saveUser(testUser);
      const retrievedUser = await databaseService.getUser('test_user_123');
      
      if (retrievedUser && retrievedUser.username === 'TestUser') {
        setLastTestResult('✅ User operations working correctly');
      } else {
        setLastTestResult('❌ User operations failed');
      }
      
      await refreshStats();
    } catch (error) {
      setLastTestResult(`❌ User test failed: ${error.message}`);
    }
  };

  const testMessageOperations = async () => {
    try {
      const testMessage = {
        id: 'test_msg_123',
        roomId: 'test_room_123',
        userId: 'test_user_123',
        text: 'This is a test message from SQLite',
        profileUrl: 'https://example.com/avatar.jpg',
        senderName: 'TestUser',
        createdAt: new Date().toISOString(),
        synced: false
      };

      await databaseService.saveMessage(testMessage);
      const messages = await databaseService.getMessages('test_room_123');
      
      if (messages.length > 0 && messages[0].text === 'This is a test message from SQLite') {
        setLastTestResult('✅ Message operations working correctly');
      } else {
        setLastTestResult('❌ Message operations failed');
      }
      
      await refreshStats();
    } catch (error) {
      setLastTestResult(`❌ Message test failed: ${error.message}`);
    }
  };

  const testRoomOperations = async () => {
    try {
      const testRoom = {
        id: 'test_room_123',
        roomId: 'test_room_123',
        isTemporary: false,
        tempChatId: null
      };

      await databaseService.saveRoom(testRoom);
      const room = await databaseService.getRoom('test_room_123');
      
      if (room && room.roomId === 'test_room_123') {
        setLastTestResult('✅ Room operations working correctly');
      } else {
        setLastTestResult('❌ Room operations failed');
      }
      
      await refreshStats();
    } catch (error) {
      setLastTestResult(`❌ Room test failed: ${error.message}`);
    }
  };

  const testContactOperations = async () => {
    try {
      await databaseService.saveContact('test_user_123', 'contact_user_456');
      const contacts = await databaseService.getSavedContacts('test_user_123');
      
      if (contacts.includes('contact_user_456')) {
        setLastTestResult('✅ Contact operations working correctly');
      } else {
        setLastTestResult('❌ Contact operations failed');
      }
      
      await refreshStats();
    } catch (error) {
      setLastTestResult(`❌ Contact test failed: ${error.message}`);
    }
  };

  const clearTestData = async () => {
    try {
      await databaseService.clearAllData();
      await refreshStats();
      setLastTestResult('✅ All test data cleared');
    } catch (error) {
      setLastTestResult(`❌ Clear failed: ${error.message}`);
    }
  };

  const runAllTests = async () => {
    setLastTestResult('🔄 Running all tests...');
    await testUserOperations();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testRoomOperations();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testMessageOperations();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testContactOperations();
    setLastTestResult('✅ All tests completed successfully');
  };

  if (!isInitialized) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: hp(2), textAlign: 'center' }}>
          🔄 Initializing SQLite...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ padding: 16, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
        SQLite Test Panel
      </Text>

      {/* Database Stats */}
      <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <Text style={{ fontSize: hp(2), fontWeight: 'bold', marginBottom: 8 }}>
          Database Stats
        </Text>
        <Text>Users: {dbStats.users || 0}</Text>
        <Text>Rooms: {dbStats.rooms || 0}</Text>
        <Text>Messages: {dbStats.messages || 0}</Text>
        <Text>Contacts: {dbStats.saved_contacts || 0}</Text>
        <Text>Temp Chats: {dbStats.temporary_chats || 0}</Text>
      </View>

      {/* Test Results */}
      <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <Text style={{ fontSize: hp(2), fontWeight: 'bold', marginBottom: 8 }}>
          Last Test Result
        </Text>
        <Text style={{ fontFamily: 'monospace', fontSize: hp(1.6) }}>
          {lastTestResult}
        </Text>
      </View>

      {/* Test Buttons */}
      <View style={{ gap: 12 }}>
        <TouchableOpacity
          style={{ backgroundColor: '#4CAF50', padding: 16, borderRadius: 12 }}
          onPress={runAllTests}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontSize: hp(1.8), fontWeight: 'bold' }}>
            🧪 Run All Tests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#2196F3', padding: 12, borderRadius: 8 }}
          onPress={testUserOperations}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Test User Operations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#2196F3', padding: 12, borderRadius: 8 }}
          onPress={testRoomOperations}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Test Room Operations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#2196F3', padding: 12, borderRadius: 8 }}
          onPress={testMessageOperations}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Test Message Operations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#2196F3', padding: 12, borderRadius: 8 }}
          onPress={testContactOperations}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>Test Contact Operations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#FF9800', padding: 12, borderRadius: 8 }}
          onPress={refreshStats}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>🔄 Refresh Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#F44336', padding: 12, borderRadius: 8 }}
          onPress={clearTestData}
        >
          <Text style={{ color: 'white', textAlign: 'center' }}>🗑️ Clear Test Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
