import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import databaseService from '../utils/database';
import notificationService from '../utils/notificationService';
import syncService from '../utils/syncService';

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(undefined);

    useEffect(() => {
        // Initialize SQLite and sync service
        const initializeServices = async () => {
            try {
                console.log('🔄 Initializing services in AuthContext...');
                await syncService.initialize();
                console.log('✅ Services initialized successfully in AuthContext');
            } catch (error) {
                console.error('❌ Error initializing services (non-blocking):', error);
                // Don't block app startup if services fail to initialize
                // They will be retried when needed
            }
        };

        initializeServices();

        const unsub = onAuthStateChanged(auth, async (user) => {
            console.log('🔄 Auth state changed:', user ? `User logged in: ${user.email}` : 'User logged out');
            if (user) {
                setIsAuthenticated(true);
                setUser(user);
                await updateUserData(user.uid);
                
                // Initialize notifications
                try {
                    const pushToken = await notificationService.registerForPushNotificationsAsync();
                    if (pushToken) {
                        await notificationService.updateUserPushToken(user.uid, pushToken);
                    }
                } catch (error) {
                    console.error('❌ Error initializing notifications:', error);
                }
                
                // Perform full sync when user logs in
                try {
                    await syncService.fullSyncForUser(user.uid);
                } catch (error) {
                    console.error('❌ Error during full sync:', error);
                }
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        });
        return unsub;
    }, []);

    const updateUserData = async (userId) => {
        try {
            // Try to get user data from SQLite first
            let userData = await databaseService.getUser(userId);
            
            if (!userData) {
                // If not in SQLite, get from Firestore and save to SQLite
                const docRef = doc(db, 'users', userId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    let data = docSnap.data();
                    userData = {
                        id: data.userId,
                        username: data.username,
                        profileUrl: data.profileUrl,
                        email: data.email
                    };
                    
                    // Save to SQLite for future use
                    await databaseService.saveUser(userData);
                }
            }

            if (userData) {
                setUser(prevUser => ({ 
                    ...prevUser, 
                    username: userData.username, 
                    profileUrl: userData.profileUrl, 
                    userId: userData.id 
                }));
            }
        } catch (error) {
            console.error('❌ Error updating user data:', error);
            
            // Fallback to original Firestore method
            const docRef = doc(db, 'users', userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                let data = docSnap.data();
                setUser(prevUser => ({ ...prevUser, username: data.username, profileUrl: data.profileUrl, userId: data.userId }));
            }
        }
    }

    const updateProfile = async (updateData) => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                return { success: false, msg: 'No user logged in' };
            }

            // Update password if provided
            if (updateData.password) {
                await updatePassword(currentUser, updateData.password);
            }

            // Update Firestore document
            const userDocRef = doc(db, 'users', currentUser.uid);
            const updateFields = {
                username: updateData.username,
                profileUrl: updateData.profileUrl
            };

            await updateDoc(userDocRef, updateFields);

            // Update SQLite
            const userData = {
                id: currentUser.uid,
                username: updateData.username,
                profileUrl: updateData.profileUrl,
                email: currentUser.email
            };
            await databaseService.saveUser(userData);

            // Update local state
            await updateUserData(currentUser.uid);

            return { success: true };
        } catch (e) {
            let msg = e.message;
            if (msg.includes('(auth/weak-password)')) msg = 'Password is too weak';
            if (msg.includes('(auth/requires-recent-login)')) msg = 'Please log out and log in again to change password';
            return { success: false, msg };
        }
    }

    const login = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (e) {
            let msg = e.message;
            if (msg.includes('(auth/invalid-email)')) msg = 'Invalid email address';
            if (msg.includes('(auth/invalid-credential)')) msg = 'Wrong credentials';
            return { success: false, msg };
        }
    }
    const logout = async () => {
        try {
            await signOut(auth);
            return { success: true };
        } catch (e) {
            return { success: false, msg: e.message, error: e };
        }
    }
    const register = async (email, password, username, profileUrl) => {
        try {
            console.log('🔄 Starting registration process in AuthContext...');
            console.log('📋 Registration data:', { 
                email, 
                username, 
                hasPassword: !!password, 
                hasProfileUrl: !!profileUrl 
            });
            
            const response = await createUserWithEmailAndPassword(auth, email, password);
            console.log('✅ Firebase user created:', response?.user?.uid);

            // Create user document in Firestore with all necessary fields
            const userData = {
                username,
                profileUrl: profileUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0088CC&color=fff&size=200`,
                userId: response?.user?.uid,
                email: response?.user?.email,
                createdAt: new Date().toISOString()
            };

            console.log('🔄 Creating user document in Firestore...');
            await setDoc(doc(db, "users", response?.user?.uid), userData);
            console.log('✅ User document created in Firestore');

            // Save user to SQLite
            try {
                console.log('🔄 Saving user to SQLite...');
                await databaseService.ensureInitialized();
                await databaseService.saveUser({
                    id: response?.user?.uid,
                    username,
                    profileUrl: userData.profileUrl,
                    email: response?.user?.email
                });
                console.log('✅ User saved to SQLite');
            } catch (sqliteError) {
                console.error('❌ SQLite save error (non-blocking):', sqliteError);
                // Don't fail registration if SQLite fails
            }

            console.log('✅ Registration process completed successfully');
            return { success: true, data: response?.user };
        } catch (e) {
            console.error('❌ Registration error in AuthContext:', e);
            let msg = e.message;
            
            // Handle specific Firebase Auth errors with user-friendly messages
            if (msg.includes('(auth/invalid-email)')) {
                msg = 'Please enter a valid email address.';
            } else if (msg.includes('(auth/email-already-in-use)')) {
                msg = 'This email is already registered. Please use a different email or sign in instead.';
            } else if (msg.includes('(auth/weak-password)')) {
                msg = 'Password is too weak. Please use at least 6 characters.';
            } else if (msg.includes('(auth/operation-not-allowed)')) {
                msg = 'Email/password accounts are not enabled. Please contact support.';
            } else if (msg.includes('(auth/too-many-requests)')) {
                msg = 'Too many failed attempts. Please try again later.';
            } else if (msg.includes('network') || msg.includes('offline') || msg.includes('connection')) {
                msg = 'Network error. Please check your internet connection and try again.';
            } else if (msg.includes('permission-denied') || msg.includes('firestore')) {
                msg = 'Database error. Please try again or contact support if the problem persists.';
            } else {
                // For any other error, provide a generic message but include the original error for debugging
                console.error('❌ Unhandled registration error:', e.code, e.message);
                msg = `Registration failed. Please try again.\n\nTechnical details: ${e.code || 'Unknown error'}`;
            }
            
            return { success: false, msg };
        }
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register, updateProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const value = useContext(AuthContext);
    if (!value) {
        throw new Error('useAuth must be used within an AuthContextProvider');
    }
    return value;
}