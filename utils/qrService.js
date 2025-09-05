import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { getRoomId } from './common';
import databaseService from './database';

export const generateQRData = (userId) => {
    return `qtalk://connect/${userId}`;
};

export const parseQRData = (data) => {
    const match = data.match(/qtalk:\/\/connect\/(.+)/);
    return match ? match[1] : null;
};

export const createTemporaryChat = async (currentUserId, scannedUserId) => {
    if (!currentUserId || !scannedUserId) {
        throw new Error('Invalid user IDs provided');
    }

    // Check if user is authenticated
    if (!auth.currentUser) {
        throw new Error('User not authenticated. Please sign in and try again.');
    }

    console.log('Creating temporary chat - Auth user:', auth.currentUser.uid);
    console.log('Current user ID:', currentUserId);
    console.log('Scanned user ID:', scannedUserId);

    try {
        const tempChatId = `temp_${currentUserId}_${scannedUserId}_${Date.now()}`;

        const tempChatData = {
            tempChatId,
            participants: [currentUserId, scannedUserId],
            createdBy: currentUserId,
            createdAt: new Date(),
            isTemporary: true
        };

        // Save to SQLite first
        await databaseService.saveTemporaryChat({
            id: tempChatId,
            ...tempChatData
        });

        // Save to Firestore
        await setDoc(doc(db, 'temporaryChats', tempChatId), tempChatData, { merge: true });

        console.log('Temporary chat created successfully:', tempChatId);
        return tempChatId;
    } catch (error) {
        console.error('Error creating temporary chat:', error);

        // If it's a network error, provide a more helpful message
        if (error.code === 'unavailable' || error.message.includes('transport')) {
            throw new Error('Network connection issue. Please check your internet and try again.');
        }

        if (error.code === 'permission-denied') {
            throw new Error('Permission denied. Please check Firestore security rules.');
        }

        throw error;
    }
};

export const saveContactPermanently = async (currentUserId, contactUserId) => {
    if (!currentUserId || !contactUserId) {
        throw new Error('Invalid user IDs provided');
    }

    // Check if user is authenticated
    if (!auth.currentUser) {
        throw new Error('User not authenticated. Please sign in and try again.');
    }

    // Ensure the current user can only save their own contacts
    if (auth.currentUser.uid !== currentUserId) {
        throw new Error('You can only save contacts for your own account.');
    }

    try {
        const contactId = `${currentUserId}_${contactUserId}`;

        console.log('Saving contact:', {
            currentUserId,
            contactUserId,
            contactId,
            authUser: auth.currentUser.uid
        });

        const contactData = {
            userId: currentUserId,
            contactUserId,
            savedAt: new Date()
        };

        // Save to SQLite first
        await databaseService.saveContact(currentUserId, contactUserId);

        // Save to Firestore
        await setDoc(doc(db, 'savedContacts', contactId), contactData, { merge: true });

        console.log('Contact saved successfully:', contactId);

    } catch (error) {
        console.error('Error saving contact:', error);

        if (error.code === 'permission-denied') {
            throw new Error('Permission denied. Please check if you are properly signed in.');
        }

        if (error.code === 'unavailable' || error.message.includes('transport')) {
            throw new Error('Network connection issue. Please check your internet and try again.');
        }

        throw error;
    }
};

export const getSavedContacts = async (userId) => {
    try {
        // Ensure database is initialized first
        await databaseService.ensureInitialized();
        
        // Try to get from SQLite first
        const localContacts = await databaseService.getSavedContacts(userId);
        
        if (localContacts && localContacts.length > 0) {
            console.log('📱 Retrieved contacts from SQLite:', localContacts.length);
            return localContacts;
        }

        // If not in SQLite, get from Firestore and sync
        const q = query(
            collection(db, 'savedContacts'),
            where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const contactIds = [];

        querySnapshot.forEach(doc => {
            const contactUserId = doc.data().contactUserId;
            contactIds.push(contactUserId);
            // Save to SQLite for future use (non-blocking)
            databaseService.saveContact(userId, contactUserId).catch(error => {
                console.error('❌ Error saving contact to SQLite:', error);
            });
        });

        console.log('🔥 Retrieved contacts from Firestore:', contactIds.length);
        return contactIds;
    } catch (error) {
        console.error('❌ Error getting saved contacts:', error);
        return [];
    }
};

export const deleteTemporaryChat = async (tempChatId) => {
    if (!tempChatId) {
        console.log('No temp chat ID provided, skipping deletion');
        return;
    }

    // Check if user is authenticated
    if (!auth.currentUser) {
        console.log('User not authenticated, skipping temp chat deletion');
        return;
    }

    try {
        console.log('Attempting to delete temporary chat:', tempChatId);
        
        // Delete from SQLite first
        await databaseService.deleteTemporaryChat(tempChatId);
        
        // Delete from Firestore
        await deleteDoc(doc(db, 'temporaryChats', tempChatId));
        console.log('Temporary chat deleted successfully:', tempChatId);
    } catch (error) {
        console.error('Error deleting temporary chat:', error);

        if (error.code === 'permission-denied') {
            console.log('Permission denied when deleting temp chat - this is non-critical');
            // Don't throw error, just log it as this is non-critical
            return;
        }

        if (error.code === 'not-found') {
            console.log('Temporary chat not found - may have been already deleted');
            return;
        }

        // For other errors, don't throw as this shouldn't block navigation
        console.log('Non-critical error deleting temp chat, continuing...');
    }
};

// Comprehensive function to delete all chat data when leaving a temporary chat
export const deleteEntireChatData = async (currentUserId, otherUserId, tempChatId = null) => {
    if (!currentUserId || !otherUserId) {
        console.log('Invalid user IDs provided, skipping chat deletion');
        return;
    }

    // Check if user is authenticated
    if (!auth.currentUser) {
        console.log('User not authenticated, skipping chat deletion');
        return;
    }

    console.log('Starting comprehensive chat data deletion...', {
        currentUserId,
        otherUserId,
        tempChatId,
        authUser: auth.currentUser.uid
    });

    try {
        // 1. Delete temporary chat record if it exists
        if (tempChatId) {
            try {
                await deleteDoc(doc(db, 'temporaryChats', tempChatId));
                console.log('Temporary chat record deleted:', tempChatId);
            } catch (error) {
                console.log('Could not delete temp chat record:', error.message);
            }
        }

        // 2. Delete all messages in the room
        const roomId = getRoomId(currentUserId, otherUserId);
        console.log('Deleting messages from room:', roomId);

        try {
            // Get all messages in the room
            const messagesRef = collection(db, 'rooms', roomId, 'messages');
            const messagesSnapshot = await getDocs(messagesRef);

            // Delete each message
            const deletePromises = messagesSnapshot.docs.map(messageDoc =>
                deleteDoc(messageDoc.ref)
            );

            await Promise.all(deletePromises);
            console.log(`Deleted ${messagesSnapshot.docs.length} messages from room ${roomId}`);
        } catch (error) {
            console.log('Could not delete messages:', error.message);
        }

        // 3. Delete the room document itself
        try {
            await deleteDoc(doc(db, 'rooms', roomId));
            console.log('Room document deleted:', roomId);
        } catch (error) {
            console.log('Could not delete room document:', error.message);
        }

        console.log('Chat data deletion completed successfully');

    } catch (error) {
        console.error('Error during comprehensive chat deletion:', error);
        // Don't throw error as this shouldn't block navigation
        console.log('Non-critical error during chat deletion, continuing...');
    }
};
