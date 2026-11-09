import fs from 'node:fs';import zlib from 'node:zlib';
// Original pixel sprites, generated from code. No third-party mascot artwork.
const W=80,H=88;const pets={robot:{base:[89,131,247],name:'Byte'},bear:{base:[211,159,83],name:'Bruno'},bug:{base:[225,113,101],name:'Pip'},cat:{base:[168,139,226],name:'Miso'},ghost:{base:[124,221,197],name:'Echo'},fox:{base:[238,147,78],name:'Fable'}};
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));const mix=(a,b,t)=>a.map((v,i)=>clamp(v*(1-t)+b[i]*t));
function png(pixels){const table=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0});const crc=b=>{let c=0xffffffff;for(const v of b)c=table[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0};const chunk=(type,data)=>{const t=Buffer.from(type),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([n,t,data,c])};const header=Buffer.alloc(13);header.writeUInt32BE(W,0);header.writeUInt32BE(H,4);header[8]=8;header[9]=6;const scan=Buffer.alloc(H*(W*4+1));for(let y=0;y<H;y++){scan[y*(W*4+1)]=0;pixels.copy(scan,y*(W*4+1)+1,y*W*4,(y+1)*W*4)}return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(scan)),chunk('IEND',Buffer.alloc(0))])}
for(const[kind,pet]of Object.entries(pets))for(let frame=0;frame<6;frame++){
 const p=Buffer.alloc(W*H*4);const ink=[24,32,68];const put=(x,y,c,a=255)=>{x=Math.round(x);y=Math.round(y);if(x<0||x>=W||y<0||y>=H)return;const i=(y*W+x)*4;p[i]=c[0];p[i+1]=c[1];p[i+2]=c[2];p[i+3]=a};
 const rect=(x,y,w,h,c,a)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,c,a)};
 const ellipse=(x,y,w,h)=>((i,j)=>((i-x-w/2)/(w/2))**2+((j-y-h/2)/(h/2))**2<=1);
 const rounded=(x,y,w,h,r)=>(i,j)=>{const dx=Math.max(x+r-i,0,i-(x+w-r-1)),dy=Math.max(y+r-j,0,j-(y+h-r-1));return i>=x&&i<x+w&&j>=y&&j<y+h&&dx*dx+dy*dy<=r*r};
 const shape=(mask,base,shine=true)=>{for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(mask(x,y)){const edge=!mask(x-1,y)||!mask(x+1,y)||!mask(x,y-1)||!mask(x,y+1);const shadow=Math.min(.38,Math.max(0,(x-26)/95+(y-24)/125));let c=edge?mix(base,ink,.58):mix(base,[22,29,66],shadow);if(!edge&&shine){const light=Math.max(0,1-Math.hypot((x-24)/37,(y-19)/42));c=mix(c,[179,211,255],light*.24);if((x*13+y*7)%61===0)c=mix(c,[255,255,255],.06)}put(x,y,c)}};
 const line=(x1,y1,x2,y2,c,width=1)=>{let dx=x2-x1,dy=y2-y1,n=Math.max(Math.abs(dx),Math.abs(dy));for(let i=0;i<=n;i++)rect(Math.round(x1+dx*i/n),Math.round(y1+dy*i/n),width,width,c)};
 const glow=[91,161,232];for(let y=82;y<86;y++)for(let x=24;x<57;x++)if(ellipse(24,82,33,4)(x,y))put(x,y,glow,25);
 const walk=frame===4?2:frame===5?-2:0;
 if(kind==='cat'){shape((x,y)=>ellipse(57,55,13,17)(x,y)&&!ellipse(57,54,9,13)(x,y),pet.base)}
 // Legs, paws, articulated arms.
 if(kind!=='ghost'){shape(rounded(29,69+Math.max(0,walk),10,11,3),pet.base);shape(rounded(43,69+Math.max(0,-walk),10,11,3),pet.base);rect(31,77+Math.max(0,walk),5,1,mix(pet.base,ink,.3));rect(45,77+Math.max(0,-walk),5,1,mix(pet.base,ink,.3))}
 shape((x,y)=>rounded(20,55+walk,9,17,4)(x,y),pet.base);shape((x,y)=>rounded(54,55-walk,9,17,4)(x,y),pet.base);shape(rounded(27,48,29,26,7),pet.base);
 if(kind==='robot'){rect(30,54,23,12,[67,105,216]);line(37,58,41,61,[196,251,255],2);line(41,61,37,64,[196,251,255],2);rect(46,62,5,2,[196,251,255]);rect(31,69,20,1,[133,177,255])}
 else if(kind==='bear'){shape(ellipse(33,54,17,16),[239,210,155],false);rect(40,57,2,2,[255,235,185])}
 else if(kind==='ghost'){shape((x,y)=>x>=24&&x<59&&y>=53&&y<78+Math.floor(Math.sin((x-24)*.43)*3),pet.base)}
 else{rect(37,59,7,8,mix(pet.base,[255,255,255],.26));line(39,61,42,63,[240,246,255]);line(42,63,39,65,[240,246,255])}
 let head;
 if(kind==='robot')head=(x,y)=>rounded(13,12,54,40,12)(x,y)||ellipse(10,22,14,22)(x,y)||ellipse(57,22,14,22)(x,y)||ellipse(24,8,18,13)(x,y)||ellipse(39,9,20,12)(x,y);
 else if(kind==='bear'){shape(ellipse(16,11,17,18),pet.base);shape(ellipse(49,11,17,18),pet.base);shape(ellipse(21,16,8,9),[133,88,64],false);shape(ellipse(53,16,8,9),[133,88,64],false);head=rounded(15,18,52,37,15)}
 else if(kind==='cat'||kind==='fox'){shape((x,y)=>(x>=15&&x<=31&&y>=10&&y<29&&y>Math.abs(x-20)*1.3+9)||(x>=49&&x<=66&&y>=10&&y<29&&y>Math.abs(x-60)*1.3+9),pet.base);head=rounded(14,22,54,34,12);rect(20,19,5,6,[229,174,192]);rect(57,19,5,6,[229,174,192])}
 else if(kind==='bug'){line(30,17,26,8,ink,2);line(51,17,55,8,ink,2);shape(ellipse(22,5,8,7),pet.base);shape(ellipse(52,5,8,7),pet.base);head=rounded(14,17,54,39,16)}
 else head=(x,y)=>rounded(15,13,52,43,20)(x,y);
 shape(head,pet.base);line(24,16,46,13,mix(pet.base,[222,236,255],.38));
 // Faceplate / cheeks, each character has a distinct silhouette and expression.
 if(kind==='robot'||kind==='ghost'){shape(rounded(22,27,37,23,5),[35,48,103],false);line(26,28,52,28,[52,68,139]);line(24,31,24,42,[54,72,143]);rect(56,32,1,13,[20,27,68]);const eye=[146,244,255];if(frame===1){rect(30,38,7,2,eye);rect(46,38,7,2,eye)}else{line(30,33,34,37,eye,2);line(34,37,30,41,eye,2);rect(46,40,7,2,eye);rect(52,39,1,2,eye)}if(frame===2)rect(39,43,4,3,eye);rect(27,25,24,1,[139,178,252]);rect(24,47,8,1,[58,78,142])}
 else{const dark=[27,28,54];for(const x of [29,50]){if(frame===1){rect(x,34,5,2,dark)}else{shape(rounded(x,30,5,8,2),dark,false);rect(x+1,31,2,2,[229,246,255]);rect(x+3,36,1,1,[111,137,184])}}if(kind==='bear'||kind==='fox')shape(ellipse(32,38,17,12),kind==='fox'?[255,224,187]:[244,219,166],false);rect(38,39,5,3,dark);line(40,42,40,44,dark);line(36,45,39,47,dark);line(40,47,44,45,dark);if(frame===2)rect(38,45,5,3,dark);rect(23,40,4,2,[220,133,145],150);rect(55,40,4,2,[220,133,145],150);if(kind==='cat'){line(20,43,11,41,[208,195,246]);line(20,46,12,48,[208,195,246]);line(60,43,70,41,[208,195,246]);line(60,46,69,48,[208,195,246])}}
 if(kind==='bug'){rect(23,23,4,3,mix(pet.base,[250,228,218],.3));rect(56,25,4,3,mix(pet.base,ink,.2))}
 // One-pixel highlights and bevels keep the sprites readable at small sizes.
 rect(29,57+walk,1,8,mix(pet.base,[246,248,255],.2));rect(57,58-walk,1,7,mix(pet.base,[246,248,255],.2));
 const data=png(p);for(const folder of ['desktop/Resources/Buddies','web/public/buddies']){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(`${folder}/${kind}-${frame}.png`,data)}
}
console.log('Built 36 original pixel-art sprite frames for six buddies.');
