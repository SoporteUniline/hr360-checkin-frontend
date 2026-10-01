import numpy as np, wave
sr=44100; T=34.0; N=int(sr*T); t=np.arange(N)/sr
L=np.zeros(N); R=np.zeros(N)
bpm=120; beat=60/bpm; bar=beat*4
rng=np.random.default_rng(7)
def add(sig,start,pan=0.0,gain=1.0):
    i=int(start*sr); j=min(N,i+len(sig))
    if i>=N or j<=0: return
    s=sig[:j-i]*gain; L[i:j]+=s*(1-pan)/1; R[i:j]+=s*(1+pan)/1
def env(n,a,d):
    x=np.arange(n)/sr; return np.minimum(1,x/a)*np.exp(-x/d)
def kick():
    n=int(.45*sr); x=np.arange(n)/sr
    f=45+110*np.exp(-x*28); ph=2*np.pi*np.cumsum(f)/sr
    return np.sin(ph)*np.exp(-x*7)*1.0+ (rng.standard_normal(n)*np.exp(-x*300))*.15
def hat(open_=False):
    n=int((.25 if open_ else .06)*sr); x=rng.standard_normal(n)
    x=np.diff(x,prepend=0); return x*env(n,.001,.08 if open_ else .018)*.25
def clap():
    n=int(.3*sr); x=rng.standard_normal(n); x=np.convolve(x,np.ones(6)/6,'same')
    e=sum(env(n,.001,.012)*(np.arange(n)>=int(k*sr)) for k in (0,.01,.02))+env(n,.001,.12)*.6
    return x*e*.35
def tone(freq,dur,kind='saw',a=.01,d=.3):
    n=int(dur*sr); x=np.arange(n)/sr
    if kind=='sine': w=np.sin(2*np.pi*freq*x)
    else:
        w=sum(np.sin(2*np.pi*freq*k*x)/k for k in range(1,9))*0.6
    return w*np.minimum(1,x/a)*np.minimum(1,(dur-x)/0.05).clip(0)
def lp(x,a): # one-pole lowpass
    y=np.zeros_like(x); acc=0
    for i in range(len(x)): acc+=a*(x[i]-acc); y[i]=acc
    return y
mid=lambda m:440*2**((m-69)/12)
# progression (Am F C G) roots / chords
prog=[(57,[57,60,64]),(53,[53,57,60]),(48,[52,55,60]),(55,[55,59,62])]
nb=int(T/bar)+1
for b in range(nb):
    st=b*bar; root,ch=prog[b%4]
    # pad
    for m in ch:
        p=tone(mid(m+12),bar,'saw',a=.4)*.05
        p=lp(p,.06)
        add(p,st,pan=rng.uniform(-.4,.4))
    # bass
    if st>=6.6-0.01:
        for k in range(8):
            if st+k*beat/2<25.05 or st+k*beat/2>=26.05:
                add(tone(mid(root-12),beat/2*.9,'saw',a=.005)*np.exp(-np.arange(int(beat/2*.9*sr))/sr*5)*.18, st+k*beat/2)
    # arp
    if st>=14.2 and not (24.05<=st<26.05):
        seq=ch+[ch[1]+12,ch[2]+12,ch[1]+12,ch[0]+12,ch[2]]
        for k in range(8):
            add(tone(mid(seq[k]+12),beat/2,'sine',a=.003)*np.exp(-np.arange(int(beat/2*sr))/sr*9)*.09, st+k*beat/2, pan=(-.5 if k%2 else .5))
# drums
for k in range(int(T/beat)):
    tt=k*beat
    if tt>=33: break
    if 25.05<=tt<26.05: continue
    if tt>=6.6: add(kick(),tt,gain=.8)
    if tt>=14.2 and k%2==1: add(clap(),tt)
    add(hat(),tt+beat/2,pan=.3)
    if tt>=18.25: add(hat(),tt+beat/4,pan=-.3,gain=.6); add(hat(),tt+3*beat/4,pan=-.3,gain=.6)
# whooshes on transitions
def whoosh(d=.7):
    n=int(d*sr); x=rng.standard_normal(n); x=lp(x,.15)
    e=np.sin(np.pi*np.arange(n)/n)**2; return x*e*.5
for ts in (6.6,14.2,18.25,21.45,24.7,29.45): add(whoosh(),ts-.45,pan=0,gain=.6)
# riser into offer
n=int(2*sr); x=np.arange(n)/sr
rise=np.sin(2*np.pi*np.cumsum(200+1400*(x/2)**2)/sr)*.08*(x/2)**2 + lp(rng.standard_normal(n),.3)*.25*(x/2)**3
add(rise,24.05)
# snare roll
for k in range(16):
    add(clap(),25.05+k*(1/16),gain=.25+.5*k/16)
# impact
n=int(1.8*sr); x=np.arange(n)/sr
imp=np.sin(2*np.pi*np.cumsum(35+80*np.exp(-x*10))/sr)*np.exp(-x*2.2)*1.0+lp(rng.standard_normal(n),.2)*np.exp(-x*4)*.4
add(imp,26.05)
# ding on success sounds
for ts in (9.3,20.45):
    for m,dt in ((84,0),(91,.08)): add(tone(mid(m),.5,'sine',a=.002)*np.exp(-np.arange(int(.5*sr))/sr*6)*.12,ts+dt)
mix=np.stack([L,R],1)
fade=np.ones(N); fs=int(32.6*sr); fade[fs:]=np.linspace(1,0,N-fs); mix*=fade[:,None]
mix/=np.abs(mix).max()/0.89
mix=np.tanh(mix*1.3)/np.tanh(1.3)*0.9
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((mix*32767).astype('<i2').tobytes()); w.close()
