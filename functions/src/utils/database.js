// Temporary shim for database utilities
// This prevents immediate errors during Firebase Functions deployment
// TODO: Refactor all database operations to use Firestore

const noop = () => Promise.resolve();
const noopQuery = () => Promise.resolve([[]]);
const noopExecute = () => Promise.resolve([[], []]);

module.exports = {
  query: noopQuery,
  execute: noopExecute,
  transaction: async (callback) => {
    const connection = {
      query: noopQuery,
      execute: noopExecute,
      beginTransaction: noop,
      commit: noop,
      rollback: noop,
      release: noop
    };
    return callback(connection);
  },
  testConnection: () => {
    console.log('Database connection skipped (using Firestore)');
    return Promise.resolve(true);
  },
  createPool: () => ({
    query: noopQuery,
    execute: noopExecute,
    getConnection: () => Promise.resolve({
      query: noopQuery,
      execute: noopExecute,
      beginTransaction: noop,
      commit: noop,
      rollback: noop,
      release: noop
    })
  }),
  getConnection: () => Promise.resolve({
    query: noopQuery,
    execute: noopExecute,
    beginTransaction: noop,
    commit: noop,
    rollback: noop,
    release: noop
  })
};