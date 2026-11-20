// Visual fixture only. Persistence is tested against the local DB in E2E.
export const createClient = () => ({rpc: () => {throw new Error('No RPC allowed in this visual fixture');}});
