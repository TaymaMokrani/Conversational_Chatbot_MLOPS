import { Elysia } from 'elysia'

const App = new Elysia()

App.post("/api/chat",({body})=>{
    return {body:body,time:new Date()}
})
export default App