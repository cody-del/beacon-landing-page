"""Create a single approximate service envelope from the supplied ZIP areas and Austin."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'dist/assets/map'
points=[]
def collect(value):
    if len(value)>=2 and isinstance(value[0],(float,int)):
        points.append(tuple(value[:2]))
    else:
        for item in value: collect(item)
for name in ['zip-reference.geojson','austin-reference.geojson']:
    for feature in json.loads((root/name).read_text())['features']:
        collect(feature['geometry']['coordinates'])
# Convex envelope gives one continuous marketing outline around all supplied areas.
def cross(o,a,b):return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
ordered=sorted(set(points));lower=[];upper=[]
for p in ordered:
    while len(lower)>=2 and cross(lower[-2],lower[-1],p)<=0:lower.pop()
    lower.append(p)
for p in reversed(ordered):
    while len(upper)>=2 and cross(upper[-2],upper[-1],p)<=0:upper.pop()
    upper.append(p)
hull=lower[:-1]+upper[:-1];ring=hull+[hull[0]]
assert all(all(cross(ring[i],ring[i+1],p)>=-1e-9 for i in range(len(ring)-1)) for p in points)
data={'type':'FeatureCollection','features':[{'type':'Feature','properties':{'name':'Beacon Blinds service area','approximate':True,'description':'One outer envelope around supplied ZIP areas and Austin, including the communities between them.'},'geometry':{'type':'Polygon','coordinates':[ring]}}]}
(root/'service-area.geojson').write_text(json.dumps(data,separators=(',',':'))+'\n')
print('Validated all',len(points),'reference boundary vertices inside one',len(hull),'vertex outline.')
print('Bounds:',min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points),max(p[1] for p in points))
