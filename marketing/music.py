import numpy as np, wave
sr=44100; T=37.5; N=int(sr*T); L=np.zeros(N); R=np.zeros(N)
mid=lambda m:440*2**((m-69)/12)
def add(sig,st,pan=0,g=1):
    i=int(st*sr)
    if i>=N: return
    j=min(N,i+len(sig)); s=sig[:j-i]*g; L[i:j]+=s*(1-pan); R[i:j]+=s*(1+pan)
def pad(f,d):
    x=np.arange(int(d*sr))/sr
    w=sum(np.sin(2*np.pi*f*k*x*(1+0.0015*(k%2)))/(k**1.6) for k in range(1,6))
    a=np.minimum(1,x/1.2)*np.minimum(1,(d-x)/1.2).clip(0); return w*a
def keys(f,d=2.5):
    x=np.arange(int(d*sr))/sr
    w=np.sin(2*np.pi*f*x)+.25*np.sin(2*np.pi*2*f*x)*np.exp(-x*3)+.08*np.sin(2*np.pi*3*f*x)*np.exp(-x*5)
    return w*np.minimum(1,x/.004)*np.exp(-x*1.6)
bar=2.4
prog=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65+2]]  # Cmaj7 Am7 Fmaj7 G6
for b in range(int(T/bar)+1):
    st=b*bar; ch=prog[b%4]
    for i,m in enumerate(ch): add(pad(mid(m),bar+1.2),st,pan=(i-1.5)*.25,g=.05)
    add(pad(mid(ch[0]-12),bar+1.2),st,g=.06)
    for k,m in enumerate([ch[0]+12,ch[2]+12,ch[1]+12,ch[3]+12]):
        add(keys(mid(m)),st+k*bar/4,pan=(.3 if k%2 else -.3),g=.05)
mix=np.stack([L,R],1)
x=np.arange(N)/sr; fade=np.minimum(1,x/1.5)*np.minimum(1,(T-x)/2.0).clip(0); mix*=fade[:,None]
mix/=np.abs(mix).max()/0.8
w=wave.open('music2.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((mix*32767).astype('<i2').tobytes()); w.close()
