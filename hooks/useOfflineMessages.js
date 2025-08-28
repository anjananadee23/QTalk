import { useCallback, useEffect, useState } from 'react';
import dbService from '../utils/database';
import { useNetworkStatus } from './useNetworkStatus';

export function useOfflineMessages(roomId, firebaseMessages = []) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const { isConnected } = useNetworkStatus();

    // Load messages from local database
    const loadLocalMessages = useCallback(async () => {
        if (!roomId) return;
        
        try {
            setLoading(true);
            const localMessages = await dbService.getMessages(roomId);
            setMessages(localMessages);
        } catch (error) {
            console.error('Error loading local messages:', error);
        } finally {
            setLoading(false);
        }
    }, [roomId]);

    // Save messages to local database
    const saveMessagesToLocal = useCallback(async (messagesToSave) => {
        if (!roomId || !messagesToSave.length) return;
        
        try {
            await dbService.saveMessages(messagesToSave, roomId);
        } catch (error) {
            console.error('Error saving messages to local:', error);
        }
    }, [roomId]);

    // Load local messages on component mount
    useEffect(() => {
        loadLocalMessages();
    }, [loadLocalMessages]);

    // When Firebase messages change and we're online, update both state and local storage
    useEffect(() => {
        if (isConnected && firebaseMessages.length > 0) {
            setMessages(firebaseMessages);
            saveMessagesToLocal(firebaseMessages);
        }
    }, [firebaseMessages, isConnected, saveMessagesToLocal]);

    // When going offline, load from local storage
    useEffect(() => {
        if (!isConnected && messages.length === 0) {
            loadLocalMessages();
        }
    }, [isConnected, messages.length, loadLocalMessages]);

    // Save single message locally
    const saveMessageLocally = useCallback(async (message) => {
        if (!roomId) return;
        
        try {
            await dbService.saveMessage({ ...message, roomId });
            // Reload messages to show the new one
            const updatedMessages = await dbService.getMessages(roomId);
            setMessages(updatedMessages);
        } catch (error) {
            console.error('Error saving message locally:', error);
        }
    }, [roomId]);

    // Save unsent message (for offline sending)
    const saveUnsentMessage = useCallback(async (message) => {
        if (!roomId) return;
        
        try {
            await dbService.saveUnsentMessage({ ...message, roomId });
            // Reload messages to show the new unsent message
            const updatedMessages = await dbService.getMessages(roomId);
            setMessages(updatedMessages);
        } catch (error) {
            console.error('Error saving unsent message:', error);
        }
    }, [roomId]);

    // Get unsent messages for syncing when online
    const getUnsentMessages = useCallback(async () => {
        try {
            const unsentMessages = await dbService.getUnsentMessages();
            return unsentMessages.filter(msg => msg.roomId === roomId);
        } catch (error) {
            console.error('Error getting unsent messages:', error);
            return [];
        }
    }, [roomId]);

    // Mark message as synced
    const markMessageAsSynced = useCallback(async (messageId) => {
        try {
            await dbService.markMessageAsSynced(messageId);
        } catch (error) {
            console.error('Error marking message as synced:', error);
        }
    }, []);

    // Clear local messages for this room
    const clearLocalMessages = useCallback(async () => {
        if (!roomId) return;
        
        try {
            await dbService.deleteMessagesForRoom(roomId);
            setMessages([]);
        } catch (error) {
            console.error('Error clearing local messages:', error);
        }
    }, [roomId]);

    return {
        messages,
        loading,
        isConnected,
        saveMessageLocally,
        saveUnsentMessage,
        getUnsentMessages,
        markMessageAsSynced,
        clearLocalMessages,
        refreshLocalMessages: loadLocalMessages
    };
}
