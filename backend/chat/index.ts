import { Elysia } from 'elysia'

const App = new Elysia()

App.post("/api/chat",({body})=>{
    // AI here 
    
    return {body:body,time:new Date()}
})

export default App