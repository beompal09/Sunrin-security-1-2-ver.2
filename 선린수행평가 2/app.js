// app.js (type=module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


/* ==== 여기에 네가 줬던 firebaseConfig 그대로 붙여넣기 ==== */
const firebaseConfig = {
  apiKey: "AIzaSyBxkSgzJr7P3Yo-M4Zm8583jQXSpW9nFF4",
  authDomain: "sunrin-security2-1-2.firebaseapp.com",
  projectId: "sunrin-security2-1-2",
  storageBucket: "sunrin-security2-1-2.firebasestorage.app",
  messagingSenderId: "557020155817",
  appId: "1:557020155817:web:7b4472733366a81ec73eb8",
  measurementId: "G-DEMVLRT69V"
};
/* ==================================================== */

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 인증 ---
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);


/* 공지 추가: {subject, title, content, date(YYYY-MM-DD)} */
export async function addNotice({ subject, title, content, date }) {
  const docRef = await addDoc(collection(db, "notices"), {
    subject,
    title,
    content,
    date,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/* 공지 수정: id + 변경할 필드 오브젝트 */
export async function updateNotice(id, data) {
  await updateDoc(doc(db, "notices", id), data);
}

/* 공지 삭제 */
export async function deleteNoticeById(id) {
  await deleteDoc(doc(db, "notices", id));
}

/* 실시간: 전체 공지 */
export function listenAllNotices(onChange) {
  // onChange(noticesArray)
  return onSnapshot(collection(db, "notices"), (snapshot) => {
    const arr = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange(arr);
  });
}

/* 실시간: 과목별 공지(subject 문자열) */
export function listenNoticesBySubject(subject, onChange) {
  const q = query(
    collection(db, "notices"),
    where("subject", "==", subject)
  );
  return onSnapshot(q, (snapshot) => {
    const arr = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    onChange(arr);
  });
}