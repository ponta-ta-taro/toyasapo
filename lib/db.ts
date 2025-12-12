import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, query, where, orderBy, limit, getDocs, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { Draft, ClinicSettings } from './types';

// Collection definitions
const DRAFTS_COLLECTION = 'drafts';
const POLICIES_COLLECTION = 'policies';
const SETTINGS_COLLECTION = 'settings';
const DEFAULT_SETTINGS_DOC = 'default';

/**
 * Save generated draft to Firestore
 */
export async function saveDraft(data: Omit<Draft, 'id' | 'createdAt'>) {
    if (!db) return null; // Fallback: no-op if no firebase

    try {
        const docRef = await addDoc(collection(db, DRAFTS_COLLECTION), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Failed to save draft:", e);
        return null; // Fail gracefully
    }
}

/**
 * Update draft approval status (for training)
 */
export async function toggleDraftApproval(id: string, isApproved: boolean) {
    if (!db) return;

    try {
        const docRef = doc(db, DRAFTS_COLLECTION, id);
        await updateDoc(docRef, { isApproved });
    } catch (e) {
        console.error("Failed to update approval:", e);
    }
}

/**
 * Save new policy version
 */
export async function savePolicy(content: string) {
    if (!db) return;

    try {
        // Get current version count (simplistic approach, or just random ID)
        // For accurate versioning we might need a transaction or counter, 
        // but for now let's just use timestamp as version ordering or count query
        const q = query(collection(db, POLICIES_COLLECTION), orderBy("version", "desc"), limit(1));
        const snapshot = await getDocs(q);
        let version = 1;

        if (!snapshot.empty) {
            version = snapshot.docs[0].data().version + 1;
        }

        await addDoc(collection(db, POLICIES_COLLECTION), {
            content,
            version,
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("Failed to save policy:", e);
    }
}

/**
 * Get latest approved drafts for few-shot learning
 */
export async function getApprovedDrafts(count: number = 3): Promise<Draft[]> {
    if (!db) return [];

    try {
        const q = query(
            collection(db, DRAFTS_COLLECTION),
            where("isApproved", "==", true),
            orderBy("createdAt", "desc"),
            limit(count)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Draft));
    } catch (e) {
        console.error("Failed to fetch approved drafts:", e);
        return [];
    }
}

/**
 * Save unified settings to Firestore (overwrite/merge default doc)
 */
export async function saveSettings(settings: Omit<ClinicSettings, 'updatedAt'>) {
    if (!db) return;
    try {
        await setDoc(doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC), {
            ...settings,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        console.error("Failed to save settings:", e);
        throw e;
    }
}

/**
 * Get unified settings
 */
export async function getSettings(): Promise<ClinicSettings | null> {
    if (!db) return null;
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, DEFAULT_SETTINGS_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as ClinicSettings;
        }
        return null;
    } catch (e) {
        console.error("Failed to get settings:", e);
        return null;
    }
}
