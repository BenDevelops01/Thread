import fs from 'node:fs';import zlib from 'node:zlib';
// Original pixel sprites, generated from code. No third-party mascot artwork.
const W=80,H=88;const pets={robot:{base:[67,173,155],name:'Tuck'},bear:{base:[211,159,83],name:'Bruno'},bug:{base:[225,113,101],name:'Pip'},cat:{base:[168,139,226],name:'Miso'},ghost:{base:[124,221,197],name:'Echo'},fox:{base:[238,147,78],name:'Fable'}};
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
 if(kind==='robot'){shape(rounded(31,53,21,17,4),[44,92,91],false);shape(ellipse(35,55,13,13),[241,190,99],false);shape(ellipse(38,58,7,7),[82,117,102],false);rect(40,60,3,3,[245,212,145]);line(34,72,49,72,[126,209,177])}
 else if(kind==='bear'){shape(ellipse(33,54,17,16),[239,210,155],false);rect(40,57,2,2,[255,235,185])}
 else if(kind==='ghost'){shape((x,y)=>x>=24&&x<59&&y>=53&&y<78+Math.floor(Math.sin((x-24)*.43)*3),pet.base)}
 else{rect(36,59,9,8,mix(pet.base,[255,255,255],.26));line(38,60,42,64,[240,246,255]);line(38,64,42,60,[240,246,255]);rect(39,62,2,1,mix(pet.base,ink,.25))}
 let head;
 if(kind==='robot'){line(50,18,53,8,[41,83,86],2);shape(rounded(50,4,9,7,2),[243,180,88],false);shape(rounded(10,29,9,15,3),[221,164,83],false);shape(rounded(62,29,9,15,3),[221,164,83],false);head=rounded(16,18,49,34,7)}
 else if(kind==='bear'){shape(ellipse(16,11,17,18),pet.base);shape(ellipse(49,11,17,18),pet.base);shape(ellipse(21,16,8,9),[133,88,64],false);shape(ellipse(53,16,8,9),[133,88,64],false);head=rounded(15,18,52,37,15)}
 else if(kind==='cat'||kind==='fox'){shape((x,y)=>(x>=15&&x<=31&&y>=10&&y<29&&y>Math.abs(x-20)*1.3+9)||(x>=49&&x<=66&&y>=10&&y<29&&y>Math.abs(x-60)*1.3+9),pet.base);head=rounded(14,22,54,34,12);rect(20,19,5,6,[229,174,192]);rect(57,19,5,6,[229,174,192])}
 else if(kind==='bug'){line(30,17,26,8,ink,2);line(51,17,55,8,ink,2);shape(ellipse(22,5,8,7),pet.base);shape(ellipse(52,5,8,7),pet.base);head=rounded(14,17,54,39,16)}
 else head=(x,y)=>rounded(15,13,52,43,20)(x,y);
 shape(head,pet.base);
 // Faceplate / cheeks, each character has a distinct silhouette and expression.
 if(kind==='robot'){shape(rounded(21,25,39,20,4),[25,61,64],false);line(24,26,55,26,[57,108,100]);const eye=[255,221,154];for(const x of [28,47]){if(frame===1){rect(x,34,7,2,eye)}else{shape(rounded(x,29,7,9,2),eye,false);rect(x+2,29,2,2,[255,245,214]);rect(x+5,35,1,2,[216,167,98])}}line(37,40,43,40,[127,207,184]);if(frame===2)rect(38,39,4,3,eye);rect(19,46,5,2,[239,182,95]);rect(57,46,5,2,[239,182,95]);rect(25,21,12,1,[138,229,192])}
 else if(kind==='ghost'){const eye=[26,76,72];for(const x of [28,48]){if(frame===1){line(x,32,x+5,31,eye,2)}else{shape(ellipse(x,29,5,8),eye,false);rect(x+1,30,2,2,[222,255,239])}}line(38,41,42,41,eye,2);if(frame===2)shape(ellipse(37,39,6,5),eye,false);rect(22,39,4,2,[211,240,178]);rect(55,39,4,2,[211,240,178]);line(54,21,58,25,[231,251,197]);line(58,21,54,25,[231,251,197]);rect(29,61,3,5,[224,249,215],150)}
 else{const dark=[27,28,54];for(const x of [29,50]){if(frame===1){rect(x,34,5,2,dark)}else{shape(rounded(x,30,5,8,2),dark,false);rect(x+1,31,2,2,[229,246,255]);rect(x+3,36,1,1,[111,137,184])}}if(kind==='bear'||kind==='fox')shape(ellipse(32,38,17,12),kind==='fox'?[255,224,187]:[244,219,166],false);rect(38,39,5,3,dark);line(40,42,40,44,dark);line(36,45,39,47,dark);line(40,47,44,45,dark);if(frame===2)rect(38,45,5,3,dark);rect(23,40,4,2,[220,133,145],150);rect(55,40,4,2,[220,133,145],150);if(kind==='cat'){line(20,43,11,41,[208,195,246]);line(20,46,12,48,[208,195,246]);line(60,43,70,41,[208,195,246]);line(60,46,69,48,[208,195,246])}}
 if(kind==='bug'){rect(23,23,4,3,mix(pet.base,[250,228,218],.3));rect(56,25,4,3,mix(pet.base,ink,.2))}
 // One-pixel highlights and bevels keep the sprites readable at small sizes.
 rect(29,57+walk,1,8,mix(pet.base,[246,248,255],.2));rect(57,58-walk,1,7,mix(pet.base,[246,248,255],.2));
 const data=png(p);for(const folder of ['desktop/Resources/Buddies','web/public/buddies']){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(`${folder}/${kind}-${frame}.png`,data)}
}
console.log('Built 36 original pixel-art sprite frames for six buddies.');
