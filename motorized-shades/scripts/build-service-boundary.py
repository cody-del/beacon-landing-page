"""Rebuild the approximate service boundary traced from the user's reference map."""
import json
import math
from pathlib import Path

project = Path(__file__).resolve().parents[1]
reference = json.loads((project / 'content/service-area-outline.json').read_text())

def mercator(latitude):
    return math.degrees(math.log(math.tan(math.pi / 4 + math.radians(latitude) / 2)))

# Fit an unrotated Web Mercator map to city-label anchors. City labels are
# approximate anchors, so this remains illustrative service coverage.
anchors = reference['anchors']
xs = [a['coordinate'][0] for a in anchors]
ys = [-mercator(a['coordinate'][1]) for a in anchors]
px = [a['pixel'][0] for a in anchors]
py = [a['pixel'][1] for a in anchors]
mean = lambda values: sum(values) / len(values)
mx, my, mpx, mpy = map(mean, [xs, ys, px, py])
scale = (sum((x-mx)*(p-mpx) for x,p in zip(xs,px)) + sum((y-my)*(p-mpy) for y,p in zip(ys,py))) / (sum((x-mx)**2 for x in xs) + sum((y-my)**2 for y in ys))
ox, oy = mpx - scale*mx, mpy - scale*my
ring = []
for x,y in reference['outlinePixels']:
    longitude = (x-ox)/scale
    latitude = math.degrees(2*math.atan(math.exp(math.radians((oy-y)/scale))) - math.pi/2)
    ring.append([round(longitude,6),round(latitude,6)])
# GeoJSON exterior rings use counterclockwise winding.
area = sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:]+ring[:1]))
assert abs(area) > 0
if area < 0: ring.reverse()
ring.append(ring[0])

def cross(a,b,c):
    return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])

for i in range(len(ring)-1):
    for j in range(i+2,len(ring)-1):
        if i == 0 and j == len(ring)-2: continue
        a,b,c,d = ring[i],ring[i+1],ring[j],ring[j+1]
        assert not (cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0), 'Boundary intersects itself'

feature = {'type':'Feature','properties':{'name':'Beacon Blinds service area','approximate':True,'description':'Boundary traced from the user-supplied service-area map on September 22, 2026.'},'geometry':{'type':'Polygon','coordinates':[ring]}}
output = project / 'dist/assets/map/service-area.geojson'
output.write_text(json.dumps({'type':'FeatureCollection','features':[feature]},separators=(',',':'))+'\n')
print(f'Validated one closed, non-intersecting outline with {len(ring)-1} vertices.')
print('Bounds:',min(p[0] for p in ring),min(p[1] for p in ring),max(p[0] for p in ring),max(p[1] for p in ring))
