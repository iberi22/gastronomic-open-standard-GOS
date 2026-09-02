// Toast state
let toasts: Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }> = [];
let nextId = 0;

export function getToasts() {
  return toasts;
}

export function addToast(message: string, type: 'success' | 'error' | 'info') {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  
  // Remove after 3 seconds
  setTimeout(() => {
    removeToast(id);
  }, 3000);
  
  return id;
}

export function removeToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
}

export function showToast(message: string, type: 'success' | 'error' | 'info') {
  return addToast(message, type);
}
