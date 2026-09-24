"""Builds ../data.js from the researched JSON. Run: python3 uniexplore/source/merge.py"""
import json, os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))
files = ['data-us.json', 'data-uk.json', 'data-intl.json', 'data-dream.json']
SHORT = [
 ('massachusetts amherst','UMass Amherst'),('pennsylvania state','Penn State'),('penn state','Penn State'),
 ('illinois','UIUC'),('california, davis','UC Davis'),('california, san diego','UC San Diego'),('california, los angeles','UCLA'),
 ('university of washington','UW Seattle'),('ohio state','Ohio State'),('michigan state','Michigan State'),('michigan','Michigan'),
 ('georgia institute','Georgia Tech'),('texas at austin','UT Austin'),('southern california','USC'),('carnegie mellon','Carnegie Mellon'),
 ('new york university','NYU'),('northeastern','Northeastern'),('boston university','Boston University'),('arizona state','Arizona State'),
 ('purdue','Purdue'),('rutgers','Rutgers'),('harvard','Harvard'),('stanford','Stanford'),('massachusetts institute','MIT'),('cornell','Cornell'),
 ("king's college",'King’s College London'),('leeds','Leeds'),('manchester','Manchester'),('warwick','Warwick'),
 ('university college london','UCL'),('imperial','Imperial'),('edinburgh','Edinburgh'),('london school of economics','LSE'),
 ('bristol','Bristol'),('glasgow','Glasgow'),('nottingham','Nottingham'),('southampton','Southampton'),('oxford','Oxford'),('cambridge','Cambridge'),
 ('university of sydney','Sydney'),('swinburne','Swinburne'),('monash','Monash'),('adelaide','Adelaide'),('macquarie','Macquarie'),
 ('melbourne','Melbourne'),('unsw','UNSW'),('new south wales','UNSW'),('australian national','ANU'),('queensland','UQ'),
 ('toronto','Toronto'),('british columbia','UBC'),('waterloo','Waterloo'),('mcgill','McGill'),
 ('national university of singapore','NUS'),('nanyang','NTU')]
out, seen = [], set()
for f in files:
    if not os.path.exists(f): continue
    for u in json.load(open(f)):
        n = u['name'].lower()
        u['short'] = next((s for k, s in SHORT if k in n), u['name'])
        uid = re.sub(r'[^a-z0-9]+', '-', (u.get('id') or u['short']).lower()).strip('-')
        while uid in seen: uid += 'x'
        seen.add(uid); u['id'] = uid
        # keep only fields the app uses (drop long notes the UI doesn't show)
        out.append(u)
# apply gap-filler patches: keys may be ids, short names or name fragments
def find(key):
    k = key.lower()
    for u in out:
        if u['id'] == k or u['short'].lower() == k: return u
    for u in out:
        if k in u['name'].lower(): return u
    return None
for pf in ['data-patch.json', 'data-patch-intl.json']:
    if not os.path.exists(pf): continue
    for key, fields in json.load(open(pf)).items():
        u = find(key)
        if not u: print('patch: no match for', key); continue
        for f, v in fields.items():
            if f == 'sources': u['sources'] = list(dict.fromkeys((u.get('sources') or []) + v))
            elif f == 'patchNote': u['note'] = ((u.get('note') or '') + ' ' + v).strip()
            else: u[f] = v
dst = '../data.js'
with open(dst, 'w') as fh:
    fh.write('/* UniExplore dataset: researched from official university pages and Common Data Sets, Sep 2026. Sources are listed per university. */\n')
    fh.write('window.UE_DATA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(out), 'universities ->', os.path.getsize(dst), 'bytes')
from collections import Counter
print(Counter(u['country'] for u in out))
