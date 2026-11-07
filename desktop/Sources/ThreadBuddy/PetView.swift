import SwiftUI
import AppKit
struct PetArtwork:View {
 let kind:String;let color:Color;var animated=true
 @Environment(\.accessibilityReduceMotion) var reduceMotion
 var body:some View{TimelineView(.animation(minimumInterval:1/20,paused:!animated||reduceMotion)){timeline in
  let t=animated && !reduceMotion ? timeline.date.timeIntervalSinceReferenceDate:0
  Canvas{context,size in
   let scale=min(size.width/240,size.height/260);var c=context;c.translateBy(x:(size.width-240*scale)/2,y:(size.height-260*scale)/2);c.scaleBy(x:scale,y:scale)
   func ellipse(_ r:CGRect,_ fill:Color){c.fill(Path(ellipseIn:r),with:.color(fill))}
   func shade(_ path:Path,_ colors:[Color],_ center:CGPoint,_ radius:CGFloat){c.fill(path,with:.radialGradient(Gradient(colors:colors),center:center,startRadius:0,endRadius:radius))}
   func line(_ a:CGPoint,_ b:CGPoint,_ col:Color,_ width:CGFloat){var p=Path();p.move(to:a);p.addLine(to:b);c.stroke(p,with:.color(col),style:StrokeStyle(lineWidth:width,lineCap:.round))}
   let bob=sin(t*2.2)*3.5
   // Grounding shadow and holographic projection ring.
   ellipse(CGRect(x:57,y:233,width:126,height:12),.black.opacity(0.15))
   let ring=Path(ellipseIn:CGRect(x:37,y:226,width:166,height:23));c.stroke(ring,with:.linearGradient(Gradient(colors:[.cyan.opacity(0.05),.cyan.opacity(0.5),.purple.opacity(0.3),.cyan.opacity(0.05)]),startPoint:CGPoint(x:40,y:220),endPoint:CGPoint(x:205,y:250)),lineWidth:1.3)
   for i in 0..<6{let a=Double(i)*1.047+t*0.23;ellipse(CGRect(x:120+cos(a)*81-2,y:237+sin(a)*10-2,width:3,height:3),.cyan.opacity(0.6))}
   c.translateBy(x:0,y:bob)
   let dark=color.opacity(0.95);let rim=Color(red:0.20,green:0.18,blue:0.22)
   // Dimensional ears / antennae.
   if kind=="bear" {
    for x:CGFloat in [57,159]{let ear=Path(ellipseIn:CGRect(x:x-12,y:47,width:40,height:46));shade(ear,[color.opacity(0.85),color,.brown.opacity(0.8)],CGPoint(x:x,y:54),50);c.stroke(ear,with:.color(rim.opacity(0.4)),lineWidth:1);shade(Path(ellipseIn:CGRect(x:x-3,y:57,width:23,height:26)),[Color(red:0.64,green:0.44,blue:0.32),color],CGPoint(x:x+8,y:70),24)}
   }else if kind=="cat"{
    for side:CGFloat in [-1,1]{var ear=Path();ear.move(to:CGPoint(x:120+side*68,y:102));ear.addQuadCurve(to:CGPoint(x:120+side*66,y:39),control:CGPoint(x:120+side*83,y:57));ear.addQuadCurve(to:CGPoint(x:120+side*18,y:74),control:CGPoint(x:120+side*38,y:48));ear.closeSubpath();shade(ear,[color,.purple.opacity(0.85)],CGPoint(x:120+side*44,y:63),65);var inner=Path();inner.move(to:CGPoint(x:120+side*61,y:53));inner.addLine(to:CGPoint(x:120+side*66,y:85));inner.addLine(to:CGPoint(x:120+side*36,y:76));inner.closeSubpath();c.fill(inner,with:.color(.pink.opacity(0.3)))}
   }else{
    for side:CGFloat in [-1,1]{line(CGPoint(x:120+side*28,y:70),CGPoint(x:120+side*36,y:36),rim.opacity(0.8),4);shade(Path(ellipseIn:CGRect(x:120+side*36-7,y:28,width:14,height:14)),[.white,color,.cyan.opacity(0.4)],CGPoint(x:120+side*36-2,y:32),13)}
   }
   // Soft paws, each with tiny toe marks.
   for side:CGFloat in [-1,1]{let x=120+side*30;let foot=Path(roundedRect:CGRect(x:x-20,y:195,width:40,height:37),cornerRadius:17);shade(foot,[color.opacity(0.9),color,Color.black.opacity(0.32)],CGPoint(x:x-5,y:198),52);for i in 0..<3{line(CGPoint(x:x-7+CGFloat(i)*7,y:220),CGPoint(x:x-7+CGFloat(i)*7,y:224),rim.opacity(0.14),1)}}
   // Body: shaded plush volume with a cyan/lilac rim.
   let body=Path(roundedRect:CGRect(x:49,y:66,width:142,height:145),cornerRadius:kind=="robot" ? 37:65)
   var glow=c;glow.addFilter(.shadow(color:.cyan.opacity(0.25),radius:9,x:-2,y:1));glow.addFilter(.shadow(color:.purple.opacity(0.18),radius:6,x:3,y:-1));glow.fill(body,with:.color(color))
   shade(body,[color.opacity(0.7),color,dark,Color.black.opacity(0.6)],CGPoint(x:89,y:91),174)
   c.stroke(body,with:.linearGradient(Gradient(colors:[.white.opacity(0.8),.white.opacity(0.15),rim.opacity(0.35),.cyan.opacity(0.4)]),startPoint:CGPoint(x:75,y:65),endPoint:CGPoint(x:185,y:203)),lineWidth:1.7)
   // Velvet fibres are deterministic, never flickering random noise.
   if kind != "robot" {for i in 0..<85{let x=66+CGFloat((i*47)%109),y=91+CGFloat((i*31)%98);if pow((x-120)/62,2)+pow((y-143)/66,2)<0.9{line(CGPoint(x:x,y:y),CGPoint(x:x+1.5,y:y-2.5),.white.opacity(i%3==0 ? 0.12:0.05),0.7)}}}
   if kind=="bug"{var seam=Path();seam.move(to:CGPoint(x:120,y:170));seam.addQuadCurve(to:CGPoint(x:120,y:209),control:CGPoint(x:128,y:195));c.stroke(seam,with:.color(rim.opacity(0.16)),lineWidth:1.5);for side:CGFloat in [-1,1]{for y:CGFloat in [174,190]{ellipse(CGRect(x:120+side*43-4,y:y,width:8,height:6),rim.opacity(0.16))}}}
   if kind=="robot"{let face=Path(roundedRect:CGRect(x:64,y:89,width:112,height:81),cornerRadius:26);shade(face,[Color(red:0.23,green:0.35,blue:0.36),Color(red:0.08,green:0.14,blue:0.18)],CGPoint(x:88,y:95),100);c.stroke(face,with:.color(.white.opacity(0.4)),lineWidth:1);line(CGPoint(x:79,y:98),CGPoint(x:146,y:98),.white.opacity(0.15),2);for i in 0..<3{ellipse(CGRect(x:109+CGFloat(i)*8,y:191,width:3,height:3),.cyan.opacity(0.8))}}
   // Arms catch their own highlights, with tiny paw creases.
   for side:CGFloat in [-1,1]{let arm=Path(ellipseIn:CGRect(x:120+side*73-11,y:156+sin(t+Double(side))*2,width:24,height:43));shade(arm,[color,Color.black.opacity(0.4)],CGPoint(x:120+side*75-4,y:162),50);c.stroke(arm,with:.color(.white.opacity(0.15)),lineWidth:1)}
   if kind=="bear"{let muzzle=Path(ellipseIn:CGRect(x:89,y:143,width:62,height:43));shade(muzzle,[Color(red:1,green:0.94,blue:0.81),Color(red:0.84,green:0.71,blue:0.51)],CGPoint(x:111,y:152),58)}
   // A pair of glossy eyes with iris, pupil, dual catchlights and blinks.
   let blink=t==0 ? false:(Int(t*12)%79==0)
   for side:CGFloat in [-1,1]{let x=120+side*29;let y:CGFloat=123
    if blink{var lid=Path();lid.move(to:CGPoint(x:x-9,y:y));lid.addQuadCurve(to:CGPoint(x:x+9,y:y),control:CGPoint(x:x,y:y+5));c.stroke(lid,with:.color(kind=="robot" ? .cyan:rim),style:StrokeStyle(lineWidth:3,lineCap:.round))}
    else{let eye=Path(ellipseIn:CGRect(x:x-10,y:y-14,width:20,height:28));shade(eye,kind=="robot" ? [.cyan.opacity(0.9),Color(red:0.1,green:0.5,blue:0.65)]:[Color(red:0.38,green:0.29,blue:0.25),Color(red:0.08,green:0.07,blue:0.10)],CGPoint(x:x-2,y:y-5),22);ellipse(CGRect(x:x-5+sin(t*0.4)*1.3,y:y-6,width:11,height:17),.black.opacity(kind=="robot" ? 0.35:0.8));ellipse(CGRect(x:x-5,y:y-9,width:6,height:7),.white.opacity(0.96));ellipse(CGRect(x:x+3,y:y+5,width:3,height:3),.white.opacity(0.45))}
    var brow=Path();brow.move(to:CGPoint(x:x-10,y:101));brow.addQuadCurve(to:CGPoint(x:x+8,y:100),control:CGPoint(x:x-1,y:96));c.stroke(brow,with:.color(rim.opacity(kind=="robot" ? 0:0.2)),style:StrokeStyle(lineWidth:2,lineCap:.round))
   }
   ellipse(CGRect(x:75,y:141,width:18,height:10),.pink.opacity(0.20));ellipse(CGRect(x:147,y:141,width:18,height:10),.pink.opacity(0.20))
   // Nose and stitched smile.
   let nose=Path(roundedRect:CGRect(x:114,y:151,width:12,height:8),cornerRadius:4);shade(nose,[.white.opacity(0.5),rim],CGPoint(x:117,y:152),13)
   var smile=Path();smile.move(to:CGPoint(x:109,y:166));smile.addQuadCurve(to:CGPoint(x:131,y:166),control:CGPoint(x:120,y:179));c.stroke(smile,with:.color(kind=="robot" ? .cyan:rim.opacity(0.8)),style:StrokeStyle(lineWidth:2.3,lineCap:.round))
   if kind=="cat" {for side:CGFloat in [-1,1]{for offset:CGFloat in [-7,0,7]{line(CGPoint(x:120+side*45,y:157+offset*0.5),CGPoint(x:120+side*78,y:155+offset),.white.opacity(0.6),1)}}}
   // Brushed tiny Thread badge and holographic dust.
   ellipse(CGRect(x:111,y:190,width:18,height:13),.white.opacity(0.10));let badge=Text("✳").font(.system(size:10,weight:.medium)).foregroundColor(kind=="robot" ? .cyan:.white.opacity(0.65));c.draw(badge,at:CGPoint(x:120,y:196))
   for i in 0..<5{let a=Double(i)*1.7+t*0.35;let x=120+cos(a)*95,y=137+sin(a)*80;ellipse(CGRect(x:x,y:y,width:2,height:2),.cyan.opacity(0.25+sin(t+Double(i))*0.15))}
  }.frame(width:190,height:215)
 }.accessibilityLabel("Detailed animated Thread desktop buddy")}
}
struct PetView:View {
 @ObservedObject var model:BuddyModel
 var body:some View{VStack(spacing:0){Text(model.busy ? "thinking…":model.follow ? "\(model.buddy.name) · following along":"\(model.buddy.name) · click to talk").font(.system(size:10,weight:.medium,design:.rounded)).padding(.horizontal,10).padding(.vertical,5).background(.ultraThinMaterial,in:Capsule()).fixedSize();PetArtwork(kind:model.buddyID,color:model.buddy.color)}.frame(width:200,height:245).background(Color.clear)}
}
