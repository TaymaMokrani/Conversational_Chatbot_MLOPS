import { Elysia } from 'elysia'
import Chat from "./chat/index"


export const App = new Elysia()
App.use(Chat)

