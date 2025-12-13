import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, getDocs, serverTimestamp, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { Draft, ClinicSettings, Email, Template, GmailImport } from './types';

// Collection definitions
const DRAFTS_COLLECTION = 'drafts';
const POLICIES_COLLECTION = 'policies';
const SETTINGS_COLLECTION = 'settings';
const EMAILS_COLLECTION = 'emails';

const TEMPLATES_COLLECTION = 'templates';
const GMAIL_IMPORTS_COLLECTION = 'gmail_imports';
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
 * Check if draft exists by emailId
 */
export async function checkDraftExists(emailId: string): Promise<string | null> {
    if (!db) return null;
    try {
        const q = query(collection(db, DRAFTS_COLLECTION), where("emailId", "==", emailId), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return snapshot.docs[0].id;
        }
        return null;
    } catch (e) {
        console.error("Failed to check draft duplicate:", e);
        return null;
    }
}

/**
 * Update draft (overwrite)
 */
export async function updateDraft(id: string, data: Partial<Draft>) {
    if (!db) return;
    try {
        const docRef = doc(db, DRAFTS_COLLECTION, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to update draft:", e);
        throw e;
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
 * Get approved drafts for Few-Shot (limit count)
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
 * Get ALL approved drafts for Learning Data Manager
 */
export async function getLearningData(): Promise<Draft[]> {
    if (!db) return [];

    try {
        console.log("Fetching learning data...");
        const q = query(
            collection(db, DRAFTS_COLLECTION),
            where("isApproved", "==", true)
        );
        const snapshot = await getDocs(q);
        console.log("Learning data count:", snapshot.size);

        const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Draft));

        // Client-side sort to avoid composite index requirement
        return docs.sort((a, b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const timeA = (a.createdAt as any)?.seconds || 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const timeB = (b.createdAt as any)?.seconds || 0;
            return timeB - timeA;
        });
    } catch (e) {
        console.error("Failed to fetch learning data:", e);
        return [];
    }
}

/**
 * Delete draft (Learning Data)
 */
export async function deleteDraft(id: string) {
    if (!db) return;
    try {
        const docRef = doc(db, DRAFTS_COLLECTION, id);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Failed to delete draft:", e);
        throw e;
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

/**
 * Save multiple emails (Batch)
 */
export async function saveEmails(emails: Email[]) {
    if (!db) return;

    // Firestore batch limit is 500
    const chunkSize = 500;
    for (let i = 0; i < emails.length; i += chunkSize) {
        const chunk = emails.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach(email => {
            const docRef = doc(db!, EMAILS_COLLECTION, email.id);
            // Convert undefined to null or omit undefined fields if needed? 
            // Firestore ignores undefined, but types might be strict.
            // Let's strip undefined explicitly or just pass it if using modern SDK behavior.
            // Safest to sanitize:
            const dataToSave = JSON.parse(JSON.stringify(email));
            batch.set(docRef, { ...dataToSave, createdAt: serverTimestamp() });
        });

        try {
            await batch.commit();
        } catch (e) {
            console.error(`Failed to save batch ${i} - ${i + chunkSize}:`, e);
            throw e;
        }
    }
}

/**
 * Delete all emails (for overwrite)
 */
export async function deleteAllEmails() {
    if (!db) return;

    try {
        const q = query(collection(db, EMAILS_COLLECTION));
        const snapshot = await getDocs(q);

        // Batch delete
        const chunkSize = 500;
        const docs = snapshot.docs;

        for (let i = 0; i < docs.length; i += chunkSize) {
            const chunk = docs.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    } catch (e) {
        console.error("Failed to delete emails:", e);
        throw e;
    }
}

/**
 * Get all emails
 */
export async function getEmails(): Promise<Email[]> {
    if (!db) return [];

    try {
        const snapshot = await getDocs(collection(db, EMAILS_COLLECTION));

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                datetime: data.datetime,
                inquiry: data.inquiry,
                response: data.response,
                classification: data.classification
            } as Email;
        });
    } catch (e) {
        console.error("Failed to get emails:", e);
        return [];
    }
}

/**
 * Update single email (for classification)
 */
/**
 * Update single email
 */
export async function updateEmail(id: string, updates: Partial<Email>) {
    if (!db) return;

    try {
        const docRef = doc(db, EMAILS_COLLECTION, id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _, ...dataToUpdate } = updates; // Avoid saving ID field

        await updateDoc(docRef, {
            ...dataToUpdate,
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to update email:", e);
    }
}

/**
 * Soft delete email
 */
export async function deleteEmail(id: string) {
    if (!db) return;
    try {
        const docRef = doc(db, EMAILS_COLLECTION, id);
        await updateDoc(docRef, {
            isDeleted: true,
            deletedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to soft delete email:", e);
        throw e;
    }
}

/**
 * Restore email from trash
 */
export async function restoreEmail(id: string) {
    if (!db) return;
    try {
        const docRef = doc(db, EMAILS_COLLECTION, id);
        await updateDoc(docRef, {
            isDeleted: false,
            deletedAt: null
        });
    } catch (e) {
        console.error("Failed to restore email:", e);
        throw e;
    }
}

/**
 * Hard delete email (Permanently)
 */
export async function hardDeleteEmail(id: string) {
    if (!db) return;
    try {
        const docRef = doc(db, EMAILS_COLLECTION, id);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Failed to hard delete email:", e);
        throw e;
    }
}
/**
 * Save new template
 */
export async function saveTemplate(data: Omit<Template, 'id' | 'createdAt'>) {
    if (!db) return null;
    try {
        const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return docRef.id;
    } catch (e) {
        console.error("Failed to save template:", e);
        return null;
    }
}

/**
 * Get all templates
 */
export async function getTemplates(): Promise<Template[]> {
    if (!db) return [];
    try {
        const q = query(collection(db, TEMPLATES_COLLECTION), orderBy("category", "asc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Template));
    } catch (e) {
        console.error("Failed to get templates:", e);
        return [];
    }
}

/**
 * Update template
 */
export async function updateTemplate(id: string, data: Partial<Template>) {
    if (!db) return;
    try {
        const docRef = doc(db, TEMPLATES_COLLECTION, id);
        await updateDoc(docRef, data);
    } catch (e) {
        console.error("Failed to update template:", e);
    }
}

/**
 * Delete template
 */
export async function deleteTemplate(id: string) {
    if (!db) return;
    try {
        const docRef = doc(db, TEMPLATES_COLLECTION, id);
        await deleteDoc(docRef);
    } catch (e) {
        console.error("Failed to delete template:", e);
    }
}

/**
 * Get unprocessed Gmail imports
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getGmailImports(): Promise<GmailImport[]> {
    if (!db) return [];
    try {
        console.log("Fetching Gmail imports...");
        const q = query(
            collection(db, GMAIL_IMPORTS_COLLECTION),
            where("isProcessed", "==", false)
        );
        const snapshot = await getDocs(q);
        console.log("Gmail imports found:", snapshot.size);

        const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as GmailImport));

        // Client-side sort
        return docs.sort((a, b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const timeA = (a.receivedAt as any)?.seconds || 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const timeB = (b.receivedAt as any)?.seconds || 0;
            return timeA - timeB; // asc
        });
    } catch (e) {
        console.error("Failed to get gmail imports:", e);
        return [];
    }
}

/**
 * Mark Gmail imports as processed
 */
export async function markGmailProcessed(ids: string[]) {
    if (!db || ids.length === 0) return;
    try {
        const batch = writeBatch(db);
        ids.forEach(id => {
            const docRef = doc(db!, GMAIL_IMPORTS_COLLECTION, id);
            batch.update(docRef, { isProcessed: true });
        });
        await batch.commit();
    } catch (e) {
        console.error("Failed to mark gmail as processed:", e);
    }
}
