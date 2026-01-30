import React from 'react'
import {Routes,Route} from 'react-router-dom'
import Home from './components/Home'
import UserForm from './components/UserForm'
const App = () => {
  return (
    <div>
    <Routes>
      <Route path='/' element={<Home/>}/>
      <Route path='/add' element={<UserForm/>}/>
    </Routes>
    </div>
  )
}

export default App