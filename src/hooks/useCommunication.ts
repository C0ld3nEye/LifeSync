import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useHousehold } from "./useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";

export interface Memo {
    id: string;
    text: string;
    authorId: string;
    authorName?: string;
    createdAt: any;
    color: string;
}

export interface Poll {
    id: string;
    question: string;
    options: string[];
    votes: Record<string, number>; // userId -> index
    status: 'open' | 'closed';
    createdAt: any;
    authorId: string;
}

export function useCommunication() {
    const { household } = useHousehold();
    const { user } = useAuth();
    const [memos, setMemos] = useState<Memo[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!household) return;

        const memosRef = collection(db, "households", household.id, "memos");
        const memosQuery = query(memosRef, orderBy("createdAt", "desc"));

        const unsubMemos = onSnapshot(memosQuery, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Memo));
            setMemos(list);
            setLoading(false);
        });

        const pollsRef = collection(db, "households", household.id, "polls");
        const pollsQuery = query(pollsRef, orderBy("createdAt", "desc"));

        const unsubPolls = onSnapshot(pollsQuery, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll));
            setPolls(list);
        });

        return () => {
            unsubMemos();
            unsubPolls();
        };
    }, [household]);

    const addMemo = async (text: string, color: string = "yellow") => {
        if (!household || !user) return;
        await addDoc(collection(db, "households", household.id, "memos"), {
            text,
            color,
            authorId: user.uid,
            authorName: user.displayName,
            createdAt: serverTimestamp()
        });
    };

    const deleteMemo = async (id: string) => {
        if (!household) return;
        await deleteDoc(doc(db, "households", household.id, "memos", id));
    };

    const createPoll = async (question: string, options: string[]) => {
        if (!household || !user) return;
        await addDoc(collection(db, "households", household.id, "polls"), {
            question,
            options,
            votes: {},
            status: 'open',
            authorId: user.uid,
            createdAt: serverTimestamp()
        });
    };

    const votePoll = async (pollId: string, optionIndex: number) => {
        if (!household || !user) return;
        const pollRef = doc(db, "households", household.id, "polls", pollId);
        await updateDoc(pollRef, {
            [`votes.${user.uid}`]: optionIndex
        });
    };

    const closePoll = async (pollId: string) => {
        if (!household) return;
        await updateDoc(doc(db, "households", household.id, "polls", pollId), {
            status: 'closed'
        });
    };

    return {
        memos,
        polls,
        loading,
        addMemo,
        deleteMemo,
        createPoll,
        votePoll,
        closePoll
    };
}
