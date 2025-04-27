'use client'
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../context/user.context";
import { useRouter } from "next/navigation";
const UserAuth=({children})=>{
  const{user}= useContext(UserContext);
  const[loading,setLoading]= useState(true) 
 
  const router = useRouter();

  

  useEffect(()=>{
    const token= localStorage.getItem('token')
    if(!token){
      router.push('/api/login')
    }
    if(!user){
      router.push('/api/login')
    }

    

  })
  return (
    <>
    {children}</>
  )
}

export default UserAuth; 