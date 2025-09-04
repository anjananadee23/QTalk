import NetInfo from '@react-native-community/netinfo';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import databaseService from '../utils/database';
import syncService from '../utils/syncService';

export default function NetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [sqliteStatus, setSqliteStatus] = useState('initializing');
  const [dbStats, setDbStats] = useState({});
  const [showDetails, setShowDetails] = useState(false);

  const updateDatabaseStats = useCallback(async () => {
    try {
      const stats = await databaseService.getDatabaseSize();
      setDbStats(stats);
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
    }
  }, []);

  const initializeSQLite = useCallback(async () => {
    try {
      setSqliteStatus('initializing');
      await syncService.initialize();
      await updateDatabaseStats();
      setSqliteStatus('ready');
      console.log('✅ SQLite database initialized and ready');
    } catch (error) {
      console.error('❌ Failed to initialize SQLite:', error);
      setSqliteStatus('error');
    }
  }, [updateDatabaseStats]);

  useEffect(() => {
    // Initialize SQLite database
    initializeSQLite();

    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      syncService.setOnlineStatus(connected);
      
      if (connected) {
        console.log('🌐 Network connected - syncing data...');
        // Trigger sync when coming back online
        syncService.syncMessagesToFirestore();
      } else {
        console.log('📱 Network disconnected - working offline');
      }
    });

    return () => unsubscribe();
  }, [initializeSQLite]);

  const getSqliteStatusColor = () => {
    switch (sqliteStatus) {
      case 'ready': return '#4CAF50';
      case 'initializing': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getSqliteStatusText = () => {
    switch (sqliteStatus) {
      case 'ready': return '💾 SQLite Ready';
      case 'initializing': return '⏳ Initializing SQLite...';
      case 'error': return '❌ SQLite Error';
      default: return '💾 SQLite Unknown';
    }
  };

  const getTotalMessages = () => {
    return dbStats.messages || 0;
  };

  const getTotalUsers = () => {
    return dbStats.users || 0;
  };

  const getTotalRooms = () => {
    return dbStats.rooms || 0;
  };

  // Show status bar if offline or SQLite is not ready
  if (isConnected && sqliteStatus === 'ready' && !showDetails) return null;

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: !isConnected ? '#ff6b6b' : getSqliteStatusColor() }]}
      onPress={() => setShowDetails(!showDetails)}
      activeOpacity={0.8}
    >
      <View style={styles.statusRow}>
        <Text style={styles.text}>
          {!isConnected ? '📱 Working offline' : getSqliteStatusText()}
        </Text>
        {(sqliteStatus === 'ready' || !isConnected) && (
          <Text style={styles.toggleText}>
            {showDetails ? '▲' : '▼'}
          </Text>
        )}
      </View>
      
      {showDetails && (
        <View style={styles.detailsContainer}>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Network:</Text>
              <Text style={styles.statusValue}>
                {isConnected ? '🌐 Online' : '📱 Offline'}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>SQLite:</Text>
              <Text style={styles.statusValue}>
                {getSqliteStatusText()}
              </Text>
            </View>
          </View>
          
          {sqliteStatus === 'ready' && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>Local Data:</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{getTotalMessages()}</Text>
                  <Text style={styles.statLabel}>Messages</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{getTotalUsers()}</Text>
                  <Text style={styles.statLabel}>Users</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{getTotalRooms()}</Text>
                  <Text style={styles.statLabel}>Rooms</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  statusValue: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  statsContainer: {
    marginTop: 8,
  },
  statsTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
});
