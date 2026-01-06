// import { logger } from './libs/logger'
import { Elysia } from 'elysia'
import Chat from "./chat/index"
export const App = new Elysia()
// App.use(
//   logger({
//     withTimestamp: true,
//   }),
// )
App.use(Chat)

