import io from 'socket.io-client'
//import {serverHost} from './config'
//const serverHost = 'https://stage-effect-server1-d32b6e8a2ea6.herokuapp.com/';
const serverHost = 'http://localhost:8000'
let defaultSocket;
let isSocketConnect = false;

let defaultConnectFn = () => {
    isSocketConnect = true;
    console.log('socket connect to server');
}

/**
 * set default socket for later use.
 *
 * @param   Socket  socket
 */
export let setDefaultSocket = (socket)=> {
    defaultSocket = socket;
}

/**
 * connect socket with namespace, execute fn function after connect.
 *
 * @param   String  namespace     The namespace of socket io
 * @param   Function  fn          The function to be execute after connection
 * @return  Socket                The willing connect socket;
 */
export let connectSocket = (namespace='', fn=defaultConnectFn)=> {

    let socket = io(serverHost+namespace);
    if (defaultSocket === undefined) defaultSocket = socket;
    socket.on('connect', fn);
    return socket;
}

/**
 * on
 *
 * @param   String      str          The namespace of socket io
 * @param   Function    fn          The function to be execute after connection
 * @return  Socket                  The willing connect socket;
 */
export let onSocket = (str, fn, socket=defaultSocket)=> {
    if (defaultSocket === undefined) return;
    socket.on(str, fn);
}

/**
 * off
 * 
 */
export let offSocket = (str, socket=defaultSocket) => {
    if (defaultSocket === undefined) return;
    socket.off(str);
}


/**
 * Emit Socket with name 'osc'
 *
 * @param   String  address     The specified address string
 * @param   Json  value         The values in JSON format
 */
export let emitOSC = (address, value, socket=defaultSocket)=> {
    socket.emit('osc', {
        address: address,
        args: [value]
    });
}

/**
 * Emit Socket with name and data
 *
 * @param   String  name     The name for socket emit
 * @param   Json  data       The emit data in JSON format
 */
export let emitData = (name, data, socket=defaultSocket)=> {
    socket.emit(name, data);
}

export {isSocketConnect};
