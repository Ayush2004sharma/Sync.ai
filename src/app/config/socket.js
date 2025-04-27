import { io } from 'socket.io-client';

let socketInstance = null;

export const initializeSocket = (projectId) => {
  if (!socketInstance) {
    socketInstance = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: {
        token: typeof window !== 'undefined' ? localStorage.getItem('token') : '',
      },
      query:{
        projectId

      }
    });
  }
  return socketInstance;

}
;

export const receiveMessage=(eventName,cb) =>{
  socketInstance.on(eventName,cb);
}
export const sendMessage= (eventName,data)=>{
  socketInstance.emit(eventName,data);
}