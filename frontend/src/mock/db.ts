import { fixtures } from './fixtures'
export let db = fixtures()
export function resetDb() {
  db = fixtures()
}
