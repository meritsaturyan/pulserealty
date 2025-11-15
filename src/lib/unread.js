// src/lib/unread.js
const KEY_TOTAL = 'pulse:unread:user:total';
const PER_PREFIX = 'pulse:unread:user:';

const num = (v) => (isNaN(v) ? 0 : Number(v));

function emit(total) {
  window.dispatchEvent(
    new CustomEvent('pulse:unread-changed', { detail: { role: 'user', total } })
  );
}

export function getUserTotal() {
  return num(localStorage.getItem(KEY_TOTAL) || '0');
}

function setTotal(v) {
  const n = Math.max(0, num(v));
  localStorage.setItem(KEY_TOTAL, String(n));
  emit(n);
}

export function incUser(threadId, step = 1) {
  setTotal(getUserTotal() + step);
  if (threadId) {
    const k = PER_PREFIX + threadId;
    localStorage.setItem(k, String(num(localStorage.getItem(k)) + step));
  }
}

export function resetUser(threadId) {
  if (!threadId) {

    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(PER_PREFIX)) localStorage.removeItem(k);
    });
    setTotal(0);
    return;
  }
  const k = PER_PREFIX + threadId;
  const was = num(localStorage.getItem(k));
  localStorage.removeItem(k);
  setTotal(getUserTotal() - was);
}
