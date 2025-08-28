import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(undefined);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            // console.log('got user: ', user);
            if (user) {
                setIsAuthenticated(true);
                setUser(user);
                updateUserData(user.uid);
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        });
        return unsub;
    }, []);

    const updateUserData = async (userId) => {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            let data = docSnap.data();
            setUser(prevUser => ({ ...prevUser, username: data.username, profileUrl: data.profileUrl, userId: data.userId }));
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
            const response = await createUserWithEmailAndPassword(auth, email, password);
            console.log('response.user :', response?.user);

            // setUser(response?.user)
            // setIsAuthenticated(true);

            await setDoc(doc(db, "users", response?.user?.uid), {
                username,
                profileUrl,
                userId: response?.user?.uid
            });
            return { success: true, data: response?.user };
        } catch (e) {
            let msg = e.message;
            if (msg.includes('(auth/invalid-email)')) msg = 'Invalid email address';
            if (msg.includes('(auth/email-already-in-use)')) msg = 'Email already in use';
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