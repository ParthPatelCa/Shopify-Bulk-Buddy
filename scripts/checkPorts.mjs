#!/usr/bin/env node
import net from 'net';

const ports = [Number(process.env.PORT)||3000, Number(process.env.NEXT_PORT)||3001];
const inUse = [];

function check(port){
  return new Promise(res=>{
    const srv = net.createServer().once('error',()=>{inUse.push(port);res();}).once('listening',()=>{srv.close(()=>res());}).listen(port,'0.0.0.0');
  });
}

for (const p of ports) {
  // eslint-disable-next-line no-await-in-loop
  await check(p);
}

if (inUse.length){
  console.error('[checkPorts] Ports in use: '+inUse.join(', '));
  process.exit(1);
}
console.log('[checkPorts] Ports available');
