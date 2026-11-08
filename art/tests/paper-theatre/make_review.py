"""Writes review.json: my verdict per generated image, plus the code-shadow variants. Edit reads here after looking."""
import json
AX={"A":"grotesque 1 / shadow 1 / halftone 0 (the safe one)","B":"grotesque 2 / shadow 2 / halftone 0","C":"grotesque 2 / shadow 3 / halftone 1","D":"grotesque 3 / shadow 2 / halftone 0, style ref: Real Monsters","E":"grotesque 3 / shadow 3 / halftone 2, style ref: Real Monsters (slice) or Sin City (customer)","F":"grotesque 3 / shadow 3 / halftone 3, style ref: Rocko concept (slice) or Sin City (customer)"}
R={}
def add(sub,v,model,seed,verdict="keep",read="",note=""):
    R[f"{sub}_{v}/{model}/{seed}"]=dict(verdict=verdict,label=f"{v}: {AX[v].split(' (')[0].split(',')[0]}" if v in AX else v,axes=AX.get(v,""),read=read,note=note)
exec(open('reads.py').read())
json.dump(R,open('review.json','w'),indent=1)
