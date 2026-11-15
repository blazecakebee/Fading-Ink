# Picks 16x16 sprites from the Angais/pixel-art-atlas-1.4m parquet shards (CC0)
# and packs them into assets/icons.png + assets/icons.json.
# usage: python3 -I pick_icons.py <shard_dir> <out_dir>
import sys, io, glob, json
import pandas as pd
from PIL import Image
WANT = {
 # nav / categories
 'life':['candle','hourglass'], 'character':['mirror','hand mirror'], 'skills':['book','spell book'],
 'cultivation':['lotus','yin yang','spirit orb','crystal ball'], 'gates':['portal','magic portal','dungeon door','gate'],
 'people':['heart','friendship bracelet'], 'career':['briefcase'], 'education':['graduation cap','scroll','school bag','backpack'],
 'assets':['house','cottage'], 'market':['coin pouch','money bag','coin'], 'world':['globe','world map','map'],
 'legacy':['family crest','crest','banner','tree'], 'settings':['gear','cog'], 'combat':['crossed swords','sword','katana'],
 'crime':['mask','lockpick','crowbar','dagger'], 'health':['health potion','medkit','first aid kit','potion'],
 'mind':['brain'], 'gym':['dumbbell','kettlebell'], 'meditate':['incense','meditation cushion','lotus flower'],
 'study':['open book','notebook','quill'], 'play':['toy ball','ball','teddy bear','yo-yo'], 'teddy':['teddy bear'],
 'food':['bread','apple','rice bowl'], 'pill':['pill','elixir','golden pill'], 'manual':['ancient scroll','scroll','tome'],
 'car':['car','sports car'], 'pet':['dog','cat','puppy'], 'dice':['dice','die'], 'phone':['smartphone','phone','mobile phone'],
 'ring':['ring','diamond ring','engagement ring'], 'baby':['baby bottle','pacifier','crib'], 'grave':['tombstone','gravestone'],
 'crown':['crown'], 'jail':['handcuffs','prison bars','jail cell'], 'salon':['scissors','hair dryer','comb'],
 'doctor':['stethoscope','syringe'], 'travel':['suitcase','airplane','compass'], 'music':['guitar','lute','music note'],
 'art':['paintbrush','palette','paint palette'], 'fire':['flame','fireball','fire'], 'lightning':['lightning bolt','lightning'],
 'water':['water drop','droplet'], 'earth':['rock','stone','boulder'], 'wood':['leaf','sapling'], 'metal':['ingot','iron ingot'],
 'ghost':['ghost','spirit'], 'demon':['demon mask','demon','skull'], 'chest':['treasure chest','chest'],
 'gem':['gem','ruby','diamond'], 'shield':['shield'], 'fist':['fist','boxing glove'], 'kick':['boot','boots'],
 'heart':['heart'], 'brokenheart':['broken heart'], 'star':['star'], 'trophy':['trophy'], 'gift':['gift','present'],
 'beer':['beer mug','beer','ale'], 'cards':['playing cards','card'], 'stocks':['chart','graph','stock chart'],
 'shop':['shop','market stall','stall'], 'hammer':['hammer'], 'knife':['knife'], 'eye':['eye','eyeball'],
 'moon':['moon','crescent moon'], 'sun':['sun'], 'skull':['skull'], 'key':['key'], 'letter':['letter','envelope'],
 'tea':['teapot','tea cup','cup of tea'], 'cigarette':['cigarette'], 'wine':['wine bottle','wine'], 'cake':['cake','birthday cake'],
 'flower':['rose','flower'], 'bed':['bed'], 'clock':['clock','pocket watch'], 'lantern':['lantern'], 'bell':['bell'],
 'feather':['feather'], 'snowball':['snowball'], 'paper':['newspaper'], 'computer':['laptop','desktop computer','computer'],
 'pickaxe':['pickaxe'], 'fishing':['fishing rod'], 'tent':['tent'], 'boat':['boat','sailboat'],
}
idx = pd.concat([pd.read_parquet(f, columns=['subject','row_id']).assign(f=f) for f in sorted(glob.glob(sys.argv[1]+'/*.parquet'))])
subj = idx.groupby('subject')
picked = {}
for name, cands in WANT.items():
    for c in cands:
        if c in subj.groups:
            g = subj.get_group(c); picked[name] = [(r.f, int(r.row_id), c) for r in g.head(6).itertuples()]; break
    else:
        # fallback: substring match
        for c in cands:
            m = idx[idx.subject.str.contains(c, regex=False)]
            if len(m): picked[name] = [(r.f, int(r.row_id), r.subject) for r in m.head(6).itertuples()]; break
missing = [k for k in WANT if k not in picked]
print('missing:', missing)
names = list(picked); cols = 16; rows = (len(names)+cols-1)//cols
sheet = Image.new('RGBA', (cols*16, rows*16)); chosen = {}
cache = {}
def load(f):
    if f not in cache:
        t = pd.read_parquet(f, columns=['image','row_id']); cache[f] = dict(zip(t.row_id.astype(int), t.image))
    return cache[f]
for i, n in enumerate(names):
    for f, rid, sub in picked[n]:
        im = Image.open(io.BytesIO(load(f)[rid]['bytes'])).convert('RGBA')
        if sum(1 for p in im.getdata() if p[3] > 0) >= 30:
            sheet.paste(im, ((i%cols)*16, (i//cols)*16)); chosen[n] = (i, sub, rid); break
sheet.save(sys.argv[2]+'/icons.png')
json.dump({'tile':16,'cols':cols,'source':'Angais/pixel-art-atlas-1.4m (CC0)',
           'icons':{n:{'i':v[0],'subject':v[1],'row_id':v[2]} for n,v in chosen.items()}},
          open(sys.argv[2]+'/icons.json','w'), indent=1)
print(len(chosen), 'icons')
