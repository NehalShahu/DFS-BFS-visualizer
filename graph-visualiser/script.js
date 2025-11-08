/* =========================
   Graph model
========================= */
class Graph {
  constructor(){ this.nodes=[]; this.edges=[]; this.nextId=0; }
  addNode(x,y){ const id=String(this.nextId++); this.nodes.push({id,x,y}); return id; }
  removeNode(id){ this.nodes=this.nodes.filter(n=>n.id!==id); this.edges=this.edges.filter(e=>e.a!==id&&e.b!==id); }
  findNodeAt(x,y,tol=20){
    for(let i=this.nodes.length-1;i>=0;i--){ const n=this.nodes[i]; if (dist(n.x,n.y,x,y)<=tol) return n; }
    return null;
  }
  addEdge(a,b){
    if(a===b) return;
    if(!this.edges.some(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a))) this.edges.push({a,b});
  }
  removeEdge(edge){ const i=this.edges.indexOf(edge); if(i>=0) this.edges.splice(i,1); }
  edgeAtPoint(x,y,tol=6){
    for(const e of this.edges){
      const a=this.nodeById(e.a), b=this.nodeById(e.b); if(!a||!b) continue;
      if (pointSegmentDistance({x,y},a,b)<=tol) return e;
    } return null;
  }
  nodeById(id){ return this.nodes.find(n=>n.id===id); }
  toAdjList(){
    const adj=new Map(); for(const n of this.nodes) adj.set(n.id,new Set());
    for(const {a,b} of this.edges){ if(adj.has(a)&&adj.has(b)){ adj.get(a).add(b); adj.get(b).add(a); } }
    return adj;
  }
}
function pointSegmentDistance(p,a,b){
  const vx=b.x-a.x, vy=b.y-a.y, wx=p.x-a.x, wy=p.y-a.y;
  const c1=vx*wx+vy*wy; if(c1<=0) return dist(p.x,p.y,a.x,a.y);
  const c2=vx*vx+vy*vy; if(c2<=c1) return dist(p.x,p.y,b.x,b.y);
  const t=c1/c2; return dist(p.x,p.y,a.x+t*vx,a.y+t*vy);
}

/* =========================
   Traversal engine
========================= */
class Traversal {
  constructor(graph, algo, startId){ this.graph=graph; this.algo=algo; this.start=startId; this.reset(); }
  reset(){
    this.adj=this.graph.toAdjList(); this.visited=new Set(); this.frontier=[];
    this.parents=new Map(); this.order=[]; this.current=null; this.explored=new Set();
    if(this.start!=null && this.adj.has(this.start)){ this.frontier.push(this.start); this.parents.set(this.start,null); }
  }
  static edgeKey(a,b){ return String([a,b].sort((x,y)=>Number(x)-Number(y)).join('-')); }
  hasNext(){ return this.frontier.length>0; }
  step(){
    if(!this.hasNext()) return false;
    const pop = (this.algo==='bfs') ? this.frontier.shift.bind(this.frontier) : this.frontier.pop.bind(this.frontier);
    const u=pop(); this.current=u;
    if(!this.visited.has(u)){
      this.visited.add(u); this.order.push(u);
      const nbrs = Array.from(this.adj.get(u)||[]).sort((a,b)=>Number(a)-Number(b));
      for(const v of nbrs){
        this.explored.add(Traversal.edgeKey(u,v));
        if(!this.visited.has(v) && !this.frontier.includes(v)){ this.frontier.push(v); if(!this.parents.has(v)) this.parents.set(v,u); }
      }
    }
    return true;
  }
}

/* =========================
   p5 sketch + UI wiring
========================= */
let graph = new Graph();
let traversal=null, playing=false;
let mode='add-node'; // add-node | add-edge | move | delete
let draggingNode=null, edgeDragFrom=null;

// Pan/Zoom
let panX=0, panY=0, zoom=1;
const Z_MIN=0.35, Z_MAX=3.5, Z_STEP=1.2;

// UI handles
const startSelect = ()=>document.getElementById('startSelect');
const sqDiv       = ()=>document.getElementById('sq');
const visitedLog  = ()=>document.getElementById('visitedLog');
const sqLabel     = ()=>document.getElementById('sqLabel');
const speedInput  = ()=>document.getElementById('speed');
const speedLabel  = ()=>document.getElementById('speedLabel');
const tooltipEl   = ()=>document.getElementById('tooltip');

function getDelay(){ return Number(speedInput().value); }

function refreshStartSelect(){
  const sel=startSelect(); const cur=sel.value; sel.innerHTML='';
  for(const n of graph.nodes){ const opt=document.createElement('option'); opt.value=n.id; opt.textContent=n.id; sel.appendChild(opt); }
  if(graph.nodes.length) sel.value = graph.nodes.some(n=>n.id===cur)?cur:graph.nodes[0].id;
}

let lastSnapshot={ algo:'bfs', frontier:[], order:[] };
function updatePanels(){
  const algo = document.querySelector('input[name="algo"]:checked').value;
  sqLabel().textContent = (algo==='bfs') ? 'Queue (BFS)' : 'Stack (DFS)';
  const source = traversal ? { algo, frontier: traversal.frontier.slice(), order: traversal.order.slice() } : lastSnapshot;

  // Frontier chips
  const display = (algo==='bfs') ? source.frontier : source.frontier.slice(); // stack: rightmost is top
  sqDiv().innerHTML='';
  for(const x of display){
    const c=document.createElement('span'); c.className='chip'; c.textContent=x; sqDiv().appendChild(c);
  }
  visitedLog().textContent = source.order.join(' → ');
}

function startTraversal(){
  const algo=document.querySelector('input[name="algo"]:checked').value;
  const start=startSelect().value;
  traversal=new Traversal(graph,algo,start);
  playing=true;
  lastSnapshot={ algo, frontier: traversal.frontier.slice(), order: [] };
}
function pauseTraversal(){ playing=false; }
function resetTraversal(){ traversal=null; playing=false; updatePanels(); }

function randomGraph(n=8, density=0.28){
  graph = new Graph();
  const pad=60, rightW=Math.min(420, window.innerWidth*0.4);
  for(let i=0;i<n;i++){
    const x = pad + Math.random()*(window.innerWidth - rightW - 2*pad);
    const y = pad + Math.random()*(window.innerHeight - 2*pad);
    graph.addNode(x,y);
  }
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ if(Math.random()<density) graph.addEdge(String(i),String(j)); }
  traversal=null; playing=false; refreshStartSelect(); fitToGraph(); updatePanels();
}

/* ---------- Drawing helpers ---------- */
function gs(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function worldToScreen(wx,wy){ return { x: wx*zoom + panX, y: wy*zoom + panY }; }
function screenToWorld(sx,sy){ return { x: (sx-panX)/zoom, y: (sy-panY)/zoom }; }

function drawEdge(e, {highlight=false, color=null, weight=null}={}){
  const a=graph.nodeById(e.a), b=graph.nodeById(e.b); if(!a||!b) return;
  stroke(color||'#334155'); strokeWeight(weight || (highlight?4:2)); line(a.x,a.y,b.x,b.y);
}
function drawNode(n, state={}){
  noStroke(); const r=18;
  let c='#1f2937';
  if(state.isCurrent)  c=gs('--current');
  else if(state.isVisited) c=gs('--visited');
  else if(state.inFrontier) c=gs('--frontier');
  fill(c); circle(n.x,n.y,r*2);
  stroke('#0b1220'); strokeWeight(2); noFill(); circle(n.x,n.y,r*2);
  noStroke(); fill('#e5e7eb'); textAlign(CENTER,CENTER); textSize(13); text(n.id, n.x, n.y);
}

/* ---------- p5 lifecycle ---------- */
let cnv;
function setup(){
  const left=document.querySelector('.left');
  cnv=createCanvas(left.clientWidth, left.clientHeight); cnv.parent(left);
  textFont('ui-sans-serif, system-ui');
  randomGraph(7,0.3);

  // Mouse wheel zoom
  cnv.mouseWheel((evt)=>{
    const delta = evt.delta; // positive=down
    const factor = (delta>0)?(1/Z_STEP):(Z_STEP);
    zoomAtMouse(factor); return false;
  });
}
function windowResized(){
  const left=document.querySelector('.left');
  resizeCanvas(left.clientWidth, left.clientHeight);
  fitToGraph();
  updatePanels();
}
let lastStepAt=0;
function draw(){
  // background
  background('#0f172a');

  // world transform
  push(); translate(panX,panY); scale(zoom);

  // base edges
  for(const e of graph.edges) drawEdge(e,{color:'#334155',weight:2});

  // explored edges (examined)
  if(traversal){
    const exC=gs('--explored');
    for(const e of graph.edges){
      const key=Traversal.edgeKey(e.a,e.b);
      if(traversal.explored.has(key)) drawEdge(e,{color:exC,weight:3});
    }
  }

  // tree edges
  if(traversal){
    const tC=gs('--accent');
    for(const [child,parent] of traversal.parents.entries()){
      if(parent==null) continue;
      drawEdge({a:child,b:parent},{color:tC,weight:4});
    }
  }

  // dragging edge preview
  if(edgeDragFrom){
    const a=edgeDragFrom; stroke('#475569'); strokeWeight(2);
    const {x:wx,y:wy}=screenToWorld(mouseX,mouseY);
    line(a.x,a.y,wx,wy);
  }

  // nodes
  for(const n of graph.nodes){
    const isVisited = traversal?.visited.has(n.id);
    const inFrontier= traversal?.frontier.includes(n.id);
    const isCurrent = traversal?.current===n.id;
    drawNode(n,{isVisited,inFrontier,isCurrent});
  }

  pop(); // end world transform

  // auto step
  if(playing && traversal){
    const now=millis();
    if(now-lastStepAt>=getDelay()){
      if(!traversal.step()) playing=false;
      lastStepAt=now;
      lastSnapshot={ algo:document.querySelector('input[name="algo"]:checked').value, frontier:traversal.frontier.slice(), order:traversal.order.slice() };
      updatePanels();
    }
  }

  // hover tooltip (in screen space)
  updateTooltip();
}

/* ---------- Fit & Zoom ---------- */
function bboxOfNodes(){
  if(!graph.nodes.length) return {minX:0,minY:0,maxX:width,maxY:height};
  let minX=+Infinity,minY=+Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const n of graph.nodes){ minX=Math.min(minX,n.x); minY=Math.min(minY,n.y); maxX=Math.max(maxX,n.x); maxY=Math.max(maxY,n.y); }
  return {minX,minY,maxX,maxY};
}
function fitToGraph(){
  const pad=60;
  const {minX,minY,maxX,maxY}=bboxOfNodes();
  const gw=Math.max(1,maxX-minX), gh=Math.max(1,maxY-minY);
  const zx=(width - 2*pad)/gw, zy=(height - 2*pad)/gh;
  zoom = constrain(Math.min(zx,zy), Z_MIN, Z_MAX);
  const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
  const sx=cx*zoom, sy=cy*zoom;
  panX = width/2 - sx; panY = height/2 - sy;
}
function zoomAtMouse(factor){
  const newZoom = constrain(zoom*factor, Z_MIN, Z_MAX);
  const mx=mouseX, my=mouseY;
  const wx = (mx - panX)/zoom, wy=(my - panY)/zoom;
  // keep world point under mouse fixed
  panX = mx - wx*newZoom; panY = my - wy*newZoom;
  zoom = newZoom;
}

/* ---------- Interactions ---------- */
function onCanvas(){ return mouseX>=0 && mouseX<=width && mouseY>=0 && mouseY<=height; }
function worldMouse(){ return screenToWorld(mouseX,mouseY); }

function mousePressed(){
  if(!onCanvas()) return;
  // panning with Space
  if(keyIsDown(32)){ draggingNode = {__pan:true, sx:mouseX, sy:mouseY, ox:panX, oy:panY}; return; }

  const {x,y}=worldMouse();
  const n=graph.findNodeAt(x,y);
  if(mode==='add-node'){
    if(!n){ graph.addNode(x,y); refreshStartSelect(); }
  } else if(mode==='add-edge'){
    if(n) edgeDragFrom=n;
  } else if(mode==='move'){
    if(n) draggingNode=n;
  } else if(mode==='delete'){
    if(n){ graph.removeNode(n.id); refreshStartSelect(); }
    else { const e=graph.edgeAtPoint(x,y); if(e) graph.removeEdge(e); }
  }
}
function mouseDragged(){
  if(!onCanvas()) return;
  if(draggingNode && draggingNode.__pan){
    panX = draggingNode.ox + (mouseX - draggingNode.sx);
    panY = draggingNode.oy + (mouseY - draggingNode.sy);
    return;
  }
  if(mode==='move' && draggingNode){
    const {x,y}=worldMouse(); draggingNode.x=x; draggingNode.y=y;
  }
}
function mouseReleased(){
  if(!onCanvas()) return;
  if(draggingNode && draggingNode.__pan){ draggingNode=null; return; }
  if(mode==='add-edge' && edgeDragFrom){
    const {x,y}=worldMouse();
    const n2=graph.findNodeAt(x,y);
    if(n2 && n2.id!==edgeDragFrom.id) graph.addEdge(edgeDragFrom.id, n2.id);
    edgeDragFrom=null;
  }
  draggingNode=null;
}

/* ---------- Tooltip ---------- */
function updateTooltip(){
  const t=tooltipEl(); const rect=cnv.elt.getBoundingClientRect();
  const mx=mouseX, my=mouseY;
  if(!onCanvas()){ t.style.opacity=0; return; }
  const {x,y}=worldMouse(); const n=graph.findNodeAt(x,y);
  if(n){
    const lines=[`Node ${n.id}`];
    if(traversal){
      lines.push(traversal.visited.has(n.id) ? 'Visited' : (traversal.frontier.includes(n.id) ? 'In frontier' : 'Unvisited'));
      const p=traversal.parents.get(n.id); if(p!=null) lines.push(`Parent: ${p}`);
    }
    t.textContent=lines.join(' • ');
    t.style.opacity=1; t.style.transform='translateY(0)';
    t.style.left=(rect.left+mx+12)+'px'; t.style.top=(rect.top+my+12)+'px';
  } else {
    t.style.opacity=0; t.style.transform='translateY(-6px)';
  }
}

/* ---------- UI wiring ---------- */
document.getElementById('btn-play').addEventListener('click', ()=>{ if(!traversal) startTraversal(); playing=true; });
document.getElementById('btn-pause').addEventListener('click', ()=>pauseTraversal());
document.getElementById('btn-step').addEventListener('click', ()=>{ if(!traversal) startTraversal(); playing=false; traversal.step(); lastSnapshot={algo:document.querySelector('input[name="algo"]:checked').value, frontier:traversal.frontier.slice(), order:traversal.order.slice()}; updatePanels(); });
document.getElementById('btn-reset').addEventListener('click', ()=>resetTraversal());
document.getElementById('btn-sample').addEventListener('click', ()=>randomGraph(8,0.3));
document.getElementById('btn-clear').addEventListener('click', ()=>{
  graph = new Graph(); traversal=null; playing=false; lastSnapshot={algo:document.querySelector('input[name="algo"]:checked').value, frontier:[], order:[]};
  refreshStartSelect(); updatePanels();
});

document.getElementById('btn-fit').addEventListener('click', ()=>fitToGraph());
document.getElementById('btn-zoom-in').addEventListener('click', ()=>zoomAtMouse(Z_STEP));
document.getElementById('btn-zoom-out').addEventListener('click', ()=>zoomAtMouse(1/Z_STEP));

// Modes
function setMode(m){
  mode=m;
  for(const id of ['mode-add-node','mode-add-edge','mode-move','mode-delete']){
    const el=document.getElementById(id);
    el.classList.toggle('primary', id==='mode-'+m);
    el.classList.toggle('ghost',   id!=='mode-'+m);
  }
}
document.getElementById('mode-add-node').addEventListener('click', ()=>setMode('add-node'));
document.getElementById('mode-add-edge').addEventListener('click', ()=>setMode('add-edge'));
document.getElementById('mode-move').addEventListener('click', ()=>setMode('move'));
document.getElementById('mode-delete').addEventListener('click', ()=>setMode('delete'));

// Keyboard shortcuts
window.addEventListener('keydown',(e)=>{
  if(e.key==='n'||e.key==='N') setMode('add-node');
  if(e.key==='e'||e.key==='E') setMode('add-edge');
  if(e.key==='m'||e.key==='M') setMode('move');
  if(e.key==='Delete') setMode('delete');

  if(e.key===' '){ e.preventDefault(); if(!traversal) startTraversal(); playing=!playing; }
  if(e.key==='ArrowRight'){ if(!traversal) startTraversal(); playing=false; traversal.step(); lastSnapshot={algo:document.querySelector('input[name="algo"]:checked').value, frontier:traversal.frontier.slice(), order:traversal.order.slice()}; updatePanels(); }
  if(e.key==='f' || e.key==='F'){ fitToGraph(); }
});

// speed label
speedInput().addEventListener('input', ()=>{ speedLabel().textContent = getDelay()+'ms'; });

// start/algo changes reset traversal
startSelect().addEventListener('change', ()=>resetTraversal());
for(const r of document.querySelectorAll('input[name="algo"]')) r.addEventListener('change', ()=>{ resetTraversal(); updatePanels(); });

// keep dropdown updated when nodes change
const _push = graph.nodes.push.bind(graph.nodes);
graph.nodes.push = function(...args){ const r=_push(...args); refreshStartSelect(); return r; };
