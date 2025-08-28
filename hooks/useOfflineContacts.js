import { useCallback, useEffect, useState } from 'react';
import dbService from '../utils/database';
import { useNetworkStatus } from './useNetworkStatus';

export function useOfflineContacts(firebaseUsers = []) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { isConnected } = useNetworkStatus();

    // Load contacts from local database
    const loadLocalContacts = useCallback(async () => {
        try {
            setLoading(true);
            const localContacts = await dbService.getContacts();
            setContacts(localContacts);
        } catch (error) {
            console.error('Error loading local contacts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Save contacts to local database
    const saveContactsToLocal = useCallback(async (contactsToSave) => {
        if (!contactsToSave.length) return;
        
        try {
            for (const contact of contactsToSave) {
                await dbService.saveContact(contact);
            }
            console.log(`✅ Saved ${contactsToSave.length} contacts locally`);
        } catch (error) {
            console.error('Error saving contacts to local:', error);
        }
    }, []);

    // Load local contacts on component mount
    useEffect(() => {
        loadLocalContacts();
    }, [loadLocalContacts]);

    // When Firebase contacts change and we're online, update both state and local storage
    useEffect(() => {
        if (isConnected && firebaseUsers.length > 0) {
            setContacts(firebaseUsers);
            saveContactsToLocal(firebaseUsers);
        }
    }, [firebaseUsers, isConnected, saveContactsToLocal]);

    // When going offline, load from local storage
    useEffect(() => {
        if (!isConnected && contacts.length === 0) {
            loadLocalContacts();
        }
    }, [isConnected, contacts.length, loadLocalContacts]);

    // Save single contact locally
    const saveContactLocally = useCallback(async (contact) => {
        try {
            await dbService.saveContact(contact);
            // Reload contacts to show the new one
            const updatedContacts = await dbService.getContacts();
            setContacts(updatedContacts);
        } catch (error) {
            console.error('Error saving contact locally:', error);
        }
    }, []);

    return {
        contacts,
        loading,
        isConnected,
        saveContactLocally,
        refreshLocalContacts: loadLocalContacts
    };
}
