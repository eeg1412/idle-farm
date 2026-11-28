import sharp from 'sharp';
const path = 'assets/fish/raw/F22-idle-v2.png';
const {data,info:{width,height}} = await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for (const threshold of [16,32,64,128,192]) {
  const region = new Uint8Array(width*100);
  const top = 565;
  for (let y=0; y<100; y++) for(let x=0;x<width;x++) region[y*width+x] = data[((top+y)*width+x)*4+3]>=threshold ? 1 : 0;
  const components = [];
  for (let y=0; y<100; y++) for(let x=0;x<width;x++){
    const start=y*width+x;
    if(!region[start]) continue;
    const queue=[start]; region[start]=0;
    const box=[x,y+top,x,y+top];
    for(let idx=0;idx<queue.length;idx++){
      const current=queue[idx],cx=current%width,cy=Math.floor(current/width);
      box[0]=Math.min(box[0],cx);box[1]=Math.min(box[1],cy+top);box[2]=Math.max(box[2],cx);box[3]=Math.max(box[3],cy+top);
      for(let sy=Math.max(0,cy-1);sy<=Math.min(99,cy+1);sy++)for(let sx=Math.max(0,cx-1);sx<=Math.min(width-1,cx+1);sx++){
        const next=sy*width+sx;if(region[next]){queue.push(next);region[next]=0;}
      }
    }
    if(queue.length>=20) components.push({box,count:queue.length,leftPixels:queue.filter(i=>i%width<=box[0]+5).map(i=>[i%width,Math.floor(i/width)+top]),rightPixels:queue.filter(i=>i%width>=box[2]-5).map(i=>[i%width,Math.floor(i/width)+top])});
  }
  console.log(threshold,JSON.stringify(components.map(({box,count,leftPixels,rightPixels})=>({box,count,leftY:[Math.min(...leftPixels.map(p=>p[1])),Math.max(...leftPixels.map(p=>p[1]))],rightY:[Math.min(...rightPixels.map(p=>p[1])),Math.max(...rightPixels.map(p=>p[1]))]}))));
}
await sharp(path).extract({left:241,top:573,width:89,height:59}).flatten({background:'#f5f1e9'}).resize(712,472,{kernel:'nearest'}).png().toFile('.catalog-expansion-2026-11-28/fish-coordinate-evidence/F22v2-mature-overlap.png');
