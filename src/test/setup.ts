import '@testing-library/jest-dom/vitest';

// History persists in localStorage; every test starts from an empty store.
beforeEach(() => {
  localStorage.clear();
});
