const api = (path, opts = {}) => fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts })
  .then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); });

let me=null, role=null, roomId=null, board=Array(9).fill(null), xTurn=true;
const $ = (s) => document.querySelector(s);
const grid=$('#grid'), leaders=$('#leaders'), statusEl=$('#status');
const socket = io();

function draw(){ grid.innerHTML=''; board.forEach((v,i)=>{ const d=document.createElement('div'); d.className='cell'+((v||(!myTurn()&&!win()))?' disabled':''); d.textContent=v||''; d.onclick=()=>move(i); grid.appendChild(d);}); }
function win(){ const L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; for(const [a,b,c] of L){ if(board[a]&&board[a]===board[b]&&board[a]===board[c]) return board[a]; } return board.every(Boolean)?'draw':null; }
function myTurn(){ return (role==='X'&&xTurn)||(role==='O'&&!xTurn); }
function move(i){ if(!myTurn()||board[i]||win()) return; socket.emit('move',{roomId,role,index:i}); }
function setStatus(t){ statusEl.textContent=t; }
async function leadersRefresh(){ const top=await api('/players'); leaders.innerHTML=''; top.forEach((p,i)=>{ const li=document.createElement('li'); li.textContent=`#${i+1} ${p.name} (${p.rating})`; leaders.appendChild(li);}); }

$('#login').onclick=async()=>{ const name=$('#name').value.trim(); if(!name) return alert('Enter a name'); me=await api('/players',{method:'POST',body:JSON.stringify({name})}); $('#me').textContent=`Signed in as ${me.name} (${me.rating})`; $('#match').classList.remove('hidden'); await leadersRefresh(); };
$('#queue').onclick=()=>{ if(!me) return alert('Sign in first'); socket.emit('queue',{id:me.id,name:me.name}); setStatus('Searching for an opponent...'); };
$('#reset').onclick=()=>{ board=Array(9).fill(null); xTurn=true; draw(); setStatus('Reset locally.'); };

draw(); leadersRefresh(); setStatus('Sign in to start.');

socket.on('role', ({roomId:rid, role:r, opponent})=>{ roomId=rid; role=r; $('#board').classList.remove('hidden'); $('#opp').textContent=`Opponent: ${opponent.name}`; });
socket.on('state', ({board:b, xTurn:xt})=>{ board=b.slice(); xTurn=xt; draw(); setStatus((win()|| (myTurn()? 'Your turn' : "Opponent's turn"))); });
socket.on('final', ({winner:w})=>{ if(w==='draw') setStatus('Draw!'); else setStatus(`${w} wins!`); });
socket.on('ratings', (r)=>{ if(me && r[me.id]) $('#me').textContent=`Signed in as ${me.name} (${r[me.id]})`; leadersRefresh(); });